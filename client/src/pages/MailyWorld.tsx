import { ArrowDownRight, ArrowLeft, ArrowUpRight, Instagram, Sparkles } from "lucide-react";
import { Link } from "wouter";

const maily = {
  outdoor: "/videos/creator-pages/maily-outdoor-routine-source-h264.mp4",
  close: "/videos/creator-pages/maily-close-social-source.mp4",
  event: "/videos/creator-pages/maily-event-unboxing-source.mp4",
};

function MailyMotion({ src, className = "" }: { src: string; className?: string }) {
  return <video autoPlay muted loop playsInline preload="metadata" className={`h-full w-full object-cover ${className}`}><source src={src} type="video/mp4" /></video>;
}

export default function MailyWorld() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fff9ed] text-[#16164a]">
      <style>{`
        @keyframes mailyUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mailySlide { from { transform: translateX(0); } to { transform: translateX(-48%); } }
        @keyframes mailyWobble { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        .maily-up { animation: mailyUp .8s cubic-bezier(.18,.78,.22,1) both; }
        .maily-up-delayed { animation: mailyUp .8s .16s cubic-bezier(.18,.78,.22,1) both; }
        .maily-scroll { animation: mailySlide 20s linear infinite; }
        .maily-wobble { animation: mailyWobble 4s ease-in-out infinite; }
      `}</style>

      <section className="relative min-h-[100svh] overflow-hidden bg-[#2720ce] text-[#fff9ed]">
        <MailyMotion src={maily.outdoor} />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(39,32,206,.48),rgba(39,32,206,.08)_56%,rgba(255,83,146,.22))]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,249,237,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,249,237,.3)_1px,transparent_1px)] [background-size:38px_38px]" />
        <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-8"><Link href="/creators"><a className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]"><ArrowLeft className="h-4 w-4" /> The circle</a></Link><p className="text-sm font-black tracking-[-.06em]">CREATOR<span className="text-[#ffdf45]">VAULT</span></p></nav>
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 sm:px-8 lg:px-12 lg:pb-14"><div className="mx-auto max-w-7xl"><div className="maily-up flex items-center gap-2 text-[10px] font-black uppercase tracking-[.23em] text-[#ffdf45]"><span className="h-2 w-2 rounded-full bg-[#ffdf45]" /> DIARIO EN MOVIMIENTO / @MAILIN_GONZALES</div><h1 className="maily-up-delayed mt-5 max-w-5xl text-[21vw] font-black leading-[.67] tracking-[-.14em] sm:text-[10rem] lg:text-[14rem]">MAILY<br /><span className="text-[#ffdf45]">MOVES</span><br />FIRST.</h1><div className="maily-up-delayed mt-8 flex flex-wrap items-center gap-4"><a href="https://www.tiktok.com/@mailin_gonzales" target="_blank" rel="noreferrer" className="rounded-full bg-[#ffdf45] px-6 py-3 text-sm font-black text-[#16164a]">Follow her rhythm <ArrowUpRight className="ml-1 inline h-4 w-4" /></a><a href="#daybook" className="inline-flex items-center gap-2 text-sm font-black"><ArrowDownRight className="h-4 w-4" /> Open the daybook</a></div></div></div>
      </section>

      <section className="overflow-hidden bg-[#ffdf45] py-4 text-[#16164a]"><div className="maily-scroll flex w-max gap-8 whitespace-nowrap text-xs font-black uppercase tracking-[.25em]"><span>THE PLAN IS PART OF THE LOOK</span><span>✦</span><span>OUTDOOR ROUTINE</span><span>✦</span><span>LIVE EVENT ENERGY</span><span>✦</span><span>SOCIAL, BUT PERSONAL</span><span>✦</span><span>THE PLAN IS PART OF THE LOOK</span><span>✦</span><span>OUTDOOR ROUTINE</span><span>✦</span><span>LIVE EVENT ENERGY</span><span>✦</span><span>SOCIAL, BUT PERSONAL</span></div></section>

      <section id="daybook" className="relative bg-[#fff9ed] px-5 py-16 sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[.74fr_1.26fr] lg:items-center"><div><p className="text-xs font-black uppercase tracking-[.23em] text-[#ed3d87]">Daybook / page one</p><h2 className="mt-5 text-[17vw] font-black leading-[.72] tracking-[-.12em] sm:text-8xl">THE<br />ROUTINE<br /><span className="text-[#2720ce]">HAS A</span><br />PULSE.</h2><p className="mt-7 max-w-sm text-lg leading-8 text-[#16164a]/75">Maily does not need a fake set to make a day feel designed. Her movement starts in real light, then keeps going.</p></div><div className="relative aspect-[9/12] overflow-hidden rounded-[0_4rem_0_4rem] border-[10px] border-[#16164a] bg-[#16164a] shadow-[18px_18px_0_#ed3d87]"><MailyMotion src={maily.outdoor} /><div className="absolute left-5 top-5 rounded-full bg-[#fff9ed] px-4 py-2 text-[10px] font-black uppercase tracking-[.19em] text-[#16164a]">OUTSIDE / ON PURPOSE</div><div className="absolute bottom-5 left-5 right-5 border-t border-white/40 pt-4 text-2xl font-black leading-[.85] tracking-[-.06em] text-white">SHE BRINGS THE COLOR WITH HER.</div></div></div></div></section>

      <section className="relative bg-[#ed3d87] px-5 py-20 text-[#fff9ed] sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.35fr_.65fr] lg:items-center"><div className="relative aspect-[4/3] overflow-hidden rounded-[4rem_0_4rem_0] bg-[#16164a]"><MailyMotion src={maily.event} /><div className="absolute inset-0 bg-gradient-to-t from-[#16164a]/80 via-transparent to-transparent" /><p className="absolute bottom-7 left-7 max-w-sm text-4xl font-black leading-[.82] tracking-[-.08em]">SHE SHOWS UP WITH THE WHOLE ROOM WATCHING.</p></div><div><p className="text-xs font-black uppercase tracking-[.23em] text-[#ffdf45]">Page two / live proof</p><h2 className="mt-5 text-[15vw] font-black leading-[.7] tracking-[-.12em] sm:text-7xl">NOT<br />JUST<br /><span className="text-[#ffdf45]">ONLINE.</span></h2><p className="mt-7 text-lg leading-8 text-white/80">An event, an unboxing, a look that changes in the middle of the moment. This is a woman building a life people can step into.</p><div className="maily-wobble mt-10 inline-flex items-center gap-2 rounded-full border-2 border-[#ffdf45] px-5 py-3 text-[10px] font-black uppercase tracking-[.2em] text-[#ffdf45]"><Sparkles className="h-4 w-4" /> Event energy / real source</div></div></div></section>

      <section className="relative min-h-[92svh] bg-[#16164a] px-5 py-16 text-[#fff9ed] sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-end"><div className="lg:pb-12"><p className="text-xs font-black uppercase tracking-[.23em] text-[#ffdf45]">Page three / close enough to know</p><h2 className="mt-5 text-[17vw] font-black leading-[.72] tracking-[-.12em] sm:text-8xl">A FACE.<br />A PLAN.<br /><span className="text-[#ed3d87]">A WORLD.</span></h2><p className="mt-8 max-w-sm text-lg leading-8 text-white/70">The closest social moments matter too. They are how a follower stops seeing content and starts recognizing a person.</p><a href="https://www.instagram.com/maily_gonzalez08/" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#ffdf45] px-6 py-3 text-sm font-black text-[#16164a]"><Instagram className="h-4 w-4" /> @MAILY_GONZALEZ08</a></div><div className="relative aspect-[9/10] overflow-hidden rounded-[50%_50%_0_0] border-[9px] border-[#fff9ed] bg-black"><MailyMotion src={maily.close} /><div className="absolute inset-x-0 bottom-0 bg-[#fff9ed] px-6 py-5 text-[#16164a]"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ed3d87]">Social close-up / direct public source</p><p className="mt-1 text-3xl font-black leading-[.84] tracking-[-.07em]">THE BEST WORLDS FEEL PERSONAL BEFORE THEY FEEL BIG.</p></div></div></div></section>

      <section className="bg-[#ffdf45] px-5 py-16 text-[#16164a] sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><h2 className="max-w-4xl text-[12vw] font-black leading-[.72] tracking-[-.12em] sm:text-7xl">SHE ISN’T<br />A PROFILE.<br />SHE’S THE<br /><span className="text-[#ed3d87]">PACE.</span></h2><div className="flex flex-wrap gap-3"><a href="https://www.tiktok.com/@mailin_gonzales" target="_blank" rel="noreferrer" className="rounded-full bg-[#16164a] px-6 py-3 text-sm font-black text-[#fff9ed]">Stay in her world <ArrowUpRight className="ml-1 inline h-4 w-4" /></a><Link href="/vault-x"><a className="rounded-full border-2 border-[#16164a] px-6 py-3 text-sm font-black">Enter VaultX</a></Link></div></div></section>
    </main>
  );
}
