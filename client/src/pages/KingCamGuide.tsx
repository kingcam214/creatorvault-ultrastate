import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clapperboard, Crown, Eye, Film, Mic2, Play, Sparkles, Wand2 } from "lucide-react";
import { Link, useLocation } from "wouter";

const guideChapters = [
  {
    eyebrow: "01 / THE ENTRY",
    title: `YOUR CONTENT\nSTAYS YOURS.`,
    message: "I built CreatorVault so a creator’s real footage, voice, and presence do not disappear into somebody else’s machine.",
    route: "/king/content",
    action: "Open the creation room",
    icon: Crown,
    accent: "#f4c56b",
    video: "/videos/kingcam-hero-cam.mp4",
    visual: "CROWN",
  },
  {
    eyebrow: "02 / THE CAMERA",
    title: `MAKE THE SOURCE\nLOOK LIKE MONEY.`,
    message: "Body Cinema starts with the footage you already own. The point is not to replace you. The point is to bring your best presence forward.",
    route: "/vault-x/studio",
    action: "Enter Body Cinema",
    icon: Film,
    accent: "#ff7eaa",
    video: "/videos/vaultx-homepage-kingcam-trailer.mp4",
    visual: "SOURCE",
  },
  {
    eyebrow: "03 / THE MESSAGE",
    title: `PUT THE WORDS\nON THE MOTION.`,
    message: "Caption Stage turns real speech into timed words that live directly on your moving media. Nothing gets reduced to a blank post and a paragraph below it.",
    route: "/creator/caption-stage",
    action: "Open Caption Stage",
    icon: Mic2,
    accent: "#9e86ff",
    video: "/videos/kingcam-hero-cam.mp4",
    visual: "WORDS",
  },
  {
    eyebrow: "04 / THE DROP",
    title: `TURN MOMENTS\nINTO A TRAILER.`,
    message: "Trailer Maker is where the strongest parts of your real footage become a real release with a beginning, a build, and a payoff.",
    route: "/trailer-maker",
    action: "Open Trailer Maker",
    icon: Clapperboard,
    accent: "#61d4c2",
    video: "/videos/vaultx-homepage-kingcam-trailer.mp4",
    visual: "DROP",
  },
  {
    eyebrow: "05 / THE GUIDE",
    title: `THE CLONE\nLIVES HERE.`,
    message: "My clone belongs inside CreatorVault. It is here to show the platform, lead people to the right room, and keep the mission clear—not just sit in somebody else’s app.",
    route: "/clone-empire-home",
    action: "Open Clone Command",
    icon: Wand2,
    accent: "#e3a145",
    video: "/videos/kingcam-hero-cam.mp4",
    visual: "KINGCAM",
  },
] as const;

function Motion({ src }: { src: string }) {
  return <video autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover"><source src={src} type="video/mp4" /></video>;
}

export default function KingCamGuide() {
  const [, setLocation] = useLocation();
  const [chapterIndex, setChapterIndex] = useState(0);
  const [autoGuide, setAutoGuide] = useState(true);
  const chapter = guideChapters[chapterIndex];
  const ChapterIcon = chapter.icon;

  useEffect(() => {
    if (!autoGuide) return;
    const next = window.setTimeout(() => setChapterIndex((current) => (current + 1) % guideChapters.length), 10500);
    return () => window.clearTimeout(next);
  }, [chapterIndex, autoGuide]);

  const progress = useMemo(() => `${((chapterIndex + 1) / guideChapters.length) * 100}%`, [chapterIndex]);
  const previous = () => { setAutoGuide(false); setChapterIndex((chapterIndex + guideChapters.length - 1) % guideChapters.length); };
  const next = () => { setAutoGuide(false); setChapterIndex((chapterIndex + 1) % guideChapters.length); };

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <style>{`
        @keyframes kingguide-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kingguide-scan { from { transform: translateY(-110%); } to { transform: translateY(120%); } }
        @keyframes kingguide-pulse { 0%, 100% { transform: scale(.95); opacity: .26; } 50% { transform: scale(1.08); opacity: .55; } }
        .kingguide-rise { animation: kingguide-rise .65s cubic-bezier(.16,.82,.2,1) both; }
        .kingguide-scan { animation: kingguide-scan 6s linear infinite; }
        .kingguide-pulse { animation: kingguide-pulse 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .kingguide-rise, .kingguide-scan, .kingguide-pulse { animation: none; } }
      `}</style>

      <section className="relative isolate min-h-[100svh] overflow-hidden bg-black">
        <div key={chapter.video} className="absolute inset-0"><Motion src={chapter.video} /></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.91)_0%,rgba(0,0,0,.63)_40%,rgba(0,0,0,.12)_70%,rgba(0,0,0,.48)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.28)_0%,transparent_36%,rgba(0,0,0,.78)_100%)]" />
        <div className="kingguide-pulse pointer-events-none absolute -left-28 top-[25%] h-96 w-96 rounded-full blur-3xl" style={{ background: `${chapter.accent}40` }} />
        <div className="kingguide-scan pointer-events-none absolute left-0 top-0 h-[18%] w-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-8">
          <Link href="/kingcam"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-white/85"><ArrowLeft className="h-4 w-4" /> KingCam</a></Link>
          <div className="rounded-full border border-white/20 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[.17em] text-white/80 backdrop-blur"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full" style={{ background: chapter.accent }} /> CreatorVault guide</div>
        </header>

        <div className="absolute right-5 top-24 z-20 flex flex-col gap-2 sm:right-8 sm:top-28">{guideChapters.map((item, index) => <button key={item.eyebrow} type="button" aria-label={`Go to ${item.eyebrow}`} onClick={() => { setAutoGuide(false); setChapterIndex(index); }} className="group flex items-center justify-end gap-2"><span className={`hidden rounded-full bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[.16em] backdrop-blur sm:block ${chapterIndex === index ? "text-white" : "text-white/40"}`}>{item.visual}</span><span className="h-3 rounded-full transition-all" style={{ width: chapterIndex === index ? 34 : 10, background: chapterIndex === index ? item.accent : "rgba(255,255,255,.35)" }} /></button>)}</div>

        <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-9 sm:px-8 sm:pb-12 lg:px-12"><div className="mx-auto max-w-7xl"><div className="grid gap-8 lg:grid-cols-[1fr_.55fr] lg:items-end"><div key={chapter.eyebrow} className="kingguide-rise"><div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.26em]" style={{ color: chapter.accent }}><ChapterIcon className="h-4 w-4" /> {chapter.eyebrow}</div><h1 className="mt-5 whitespace-pre-line text-[15vw] font-black leading-[.68] tracking-[-.13em] sm:text-7xl lg:text-8xl">{chapter.title}</h1><p className="mt-6 max-w-xl text-base leading-7 text-white/76 sm:text-lg">{chapter.message}</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={() => setLocation(chapter.route)} className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black text-black" style={{ background: chapter.accent }}><Sparkles className="h-4 w-4" /> {chapter.action}</button><button type="button" onClick={next} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-black/25 px-6 text-sm font-black backdrop-blur"><ArrowRight className="h-4 w-4" /> Show me the next room</button></div></div>
            <aside className="rounded-[2rem] border border-white/15 bg-black/45 p-5 backdrop-blur-xl"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/45">KingCam’s platform map</p><div className="mt-5 space-y-3">{guideChapters.map((item, index) => { const Icon = item.icon; const active = chapterIndex === index; return <button type="button" key={item.eyebrow} onClick={() => { setAutoGuide(false); setChapterIndex(index); }} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${active ? "bg-white/10" : "hover:bg-white/[.06]"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: active ? `${item.accent}33` : "rgba(255,255,255,.07)", color: active ? item.accent : "rgba(255,255,255,.52)" }}><Icon className="h-4 w-4" /></span><span><span className="block text-[9px] font-black uppercase tracking-[.14em] text-white/45">{item.eyebrow.split(" / ")[0]}</span><span className="mt-1 block text-sm font-black leading-4">{item.visual}</span></span>{active && <Check className="ml-auto h-4 w-4" style={{ color: item.accent }} />}</button>; })}</div></aside>
          </div>
          <div className="mt-8 flex items-center gap-3"><button type="button" onClick={previous} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/30"><ArrowLeft className="h-4 w-4" /></button><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full transition-all duration-500" style={{ width: progress, background: chapter.accent }} /></div><button type="button" onClick={() => setAutoGuide(!autoGuide)} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-black/30 px-4 text-[10px] font-black uppercase tracking-[.15em]">{autoGuide ? <><Play className="h-3.5 w-3.5 fill-current" /> Auto guide</> : <><Eye className="h-3.5 w-3.5" /> Manual guide</>}</button></div>
        </div></div>
      </section>
    </main>
  );
}
