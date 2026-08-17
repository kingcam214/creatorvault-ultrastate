import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowUpRight, ChevronRight, Crown, Instagram, Sparkles, Star, Video } from "lucide-react";

type Creator = {
  slug: string;
  name: string;
  handle: string;
  handles?: string[];
  line: string;
  world: string;
  pulse: string;
  note: string;
  platformLabel?: string;
  profileUrl?: string;
  image?: string;
  video?: string;
  imagePosition?: string;
  motionChapters?: Array<{ src: string; title: string; eyebrow: string; feeling: string }>;
  publicPresence?: Array<{ label: string; handle: string; href: string; proof: string }>;
  creatorVaultHorizon?: { title: string; gross: string; share: string; context: string; pillars: string[] };
  colors: { ink: string; glow: string; wash: string; edge: string };
  status: "feature" | "roster";
};

const creators: Creator[] = [
  {
    slug: "reshula",
    name: "Paola ReShula",
    handle: "@reshula24",
    line: "Dominican presence. Unmissable energy.",
    world: "THE MOMENT WAS ALREADY HERS.",
    pulse: "Body, beauty, fashion, and the kind of presence that makes a whole room look twice.",
    note: "CreatorVault founding circle · real owner-approved motion",
    profileUrl: "https://www.instagram.com/reshula24/",
    video: "/videos/owner-supplied/reshula-tropical-motion.mp4",
    image: "/images/creator-pages/reshula-public-source.jpg",
    imagePosition: "center",
    motionChapters: [
      { src: "/videos/creator-pages/reshula-market-comedy.mp4", eyebrow: "01 · In public", title: "SHE MAKES THE AISLE HER STAGE.", feeling: "Everyday comedy, full-body movement, and the confidence to make strangers stop and watch." },
      { src: "/videos/creator-pages/reshula-mall-dance.mp4", eyebrow: "02 · Main character", title: "SHE DOES NOT WAIT FOR THE ROOM.", feeling: "Mall-floor energy, sharp movement, and a real social moment built around her presence." },
      { src: "/videos/creator-pages/reshula-gym-joy.mp4", eyebrow: "03 · Gym joy", title: "STRENGTH DOESN'T HAVE TO BE SERIOUS.", feeling: "Fitness culture, spontaneous dance, and the kind of joy that moves through the whole room." },
      { src: "/videos/creator-pages/reshula-mirror-lifestyle.mp4", eyebrow: "04 · After hours", title: "THE CAMERA KNOWS HER ANGLE.", feeling: "A personal behind-the-scenes moment that keeps the world intimate without making it small." },
    ],
    colors: { ink: "#130608", glow: "#ff5d92", wash: "#ffbdd1", edge: "#ffd0df" },
    status: "feature",
  },
  {
    slug: "maily",
    name: "Maili Gonzales",
    handle: "@maily_gonzalez08",
    handles: ["@maily_crochet_08", "@mailin_gonzales"],
    line: "Musa do mar. Handmade heat.",
    world: "SHE MAKES SUMMER LOOK PERSONAL.",
    pulse: "Dominican lifestyle, beach energy, fashion instinct, and a world that already belongs to her.",
    note: "CreatorVault founding circle · public creator source",
    profileUrl: "https://www.instagram.com/maily_gonzalez08/",
    image: "/images/creator-pages/maily-public-source.jpg",
    imagePosition: "center 32%",
    motionChapters: [
      { src: "/videos/creator-pages/maily-beauty-vlog.mp4", eyebrow: "01 · Beauty diary", title: "SHE MAKES THE WHOLE DAY PART OF THE LOOK.", feeling: "A real beauty-vlog rhythm from the ride there through the final nail reveal." },
      { src: "/videos/creator-pages/maily-street-energy.mp4", eyebrow: "02 · Outside", title: "THE CITY MOVES WHEN SHE DOES.", feeling: "Street energy, confident presence, and a real Dominican lifestyle pulse." },
      { src: "/videos/creator-pages/maily-coastal-motion.mp4", eyebrow: "03 · Coastline", title: "SUMMER IS A PERSONALITY.", feeling: "Light, water, and the natural coastal energy already inside her public world." },
    ],
    colors: { ink: "#061422", glow: "#48c7ff", wash: "#9ee9ff", edge: "#d4f6ff" },
    status: "feature",
  },
  {
    slug: "the-biggest-b",
    name: "The Biggest B",
    handle: "@iamthe_bcb",
    handles: ["@thatssthebcb_", "@Roxiee102", "luvRoxie"],
    line: "One woman. Multiple worlds. Every channel moving.",
    world: "SHE IS THE VIRAL PULL, THE LIFESTYLE, AND THE PRIVATE WORLD.",
    pulse: "Fitness, daily life, viral personality, and an already-active paid fan space—all connected to the same creator instead of scattered across fake separate profiles.",
    note: "CreatorVault founding circle · verified multi-platform creator",
    profileUrl: "https://www.snapchat.com/@iamthe_bcb",
    platformLabel: "Follow her on Snapchat",
    image: "/images/creator-pages/biggest-b-public-source.jpg",
    imagePosition: "center",
    publicPresence: [
      { label: "Current Snapchat", handle: "@iamthe_bcb", href: "https://www.snapchat.com/@iamthe_bcb", proof: "44K public followers · active Spotlight creator" },
      { label: "Current X", handle: "@Roxiee102", href: "https://x.com/Roxiee102", proof: "33.3K public followers · 3,811 public posts" },
      { label: "Existing membership", handle: "@luvroxieann", href: "https://onlyfans.com/luvroxie", proof: "Directly linked from X · public page: $10/month · 549 posts · 652 media" },
    ],
    creatorVaultHorizon: {
      title: "THE CREATORVAULT HORIZON THAT SHE WAS CHOSEN FOR.",
      gross: "$2.84M–$7.95M",
      share: "$1.99M–$5.57M",
      context: "Original Year 1 CreatorVault planning model for The Biggest B. It is a model of what a fully connected creator machine can target—not her current income, not a fan promise, and not a guaranteed result.",
      pillars: ["fitness subscriptions", "premium membership", "wellness drops", "brand work", "custom moments", "CreatorVault distribution"],
    },
    colors: { ink: "#0d1209", glow: "#b6ff4d", wash: "#e4ffaf", edge: "#f1ffd1" },
    status: "feature",
  },
  {
    slug: "diana",
    name: "Diana Fils-Aime",
    handle: "@diana_queen1112",
    handles: ["@ddiananailqueen"],
    line: "Beauty. Movement. Her own rhythm.",
    world: "HER LOOK IS THE LANGUAGE.",
    pulse: "Personal beauty, fitness energy, and a life built in her own colors.",
    note: "CreatorVault founding circle · public creator source",
    profileUrl: "https://www.instagram.com/diana_queen1112/",
    image: "/images/creator-pages/diana-public-source.jpg",
    imagePosition: "center 58%",
    motionChapters: [
      { src: "/videos/creator-pages/diana-porch-dance.mp4", eyebrow: "01 · Her rhythm", title: "SHE LETS THE BEAT FIND HER.", feeling: "A relaxed real-world dance moment with personality, style, and Haitian-Creole energy." },
      { src: "/videos/creator-pages/diana-city-style.mp4", eyebrow: "02 · City glow", title: "THE LOOK CARRIES THE STORY.", feeling: "A vivid beauty-and-style chapter that keeps her personal world in motion." },
    ],
    colors: { ink: "#110a20", glow: "#ad7cff", wash: "#dac6ff", edge: "#f0e9ff" },
    status: "feature",
  },
  {
    slug: "aderly",
    name: "Aderly Sanchez",
    handle: "@adyyyyyyyyu",
    handles: ["@adysanchesz"],
    line: "High heat. No borrowed energy.",
    world: "SHE BRINGS HER OWN WEATHER.",
    pulse: "A Dominican creator world with personal style, motion, and a point of view that does not need permission.",
    note: "CreatorVault founding circle · public creator source",
    profileUrl: "https://www.instagram.com/adyyyyyyyyu/",
    image: "/images/creator-pages/aderly-public-source.jpg",
    imagePosition: "center",
    motionChapters: [
      { src: "/videos/creator-pages/aderly-follow-me.mp4", eyebrow: "01 · Follow her", title: "SHE WALKS LIKE THE STORY IS ALREADY HERS.", feeling: "A real full-body entrance that turns her page into a place you follow, not just scroll past." },
    ],
    colors: { ink: "#150a04", glow: "#ff9955", wash: "#ffd2ab", edge: "#ffe7d2" },
    status: "feature",
  },
  {
    slug: "leslie",
    name: "Leslie",
    handle: "@princesadeafrica",
    handles: ["@negriitax3"],
    line: "Her life. Her movement. Her page.",
    world: "SHE MAKES HER OWN WAY LOOK EASY.",
    pulse: "Lifestyle, travel energy, and a world that carries her name without borrowing anybody else’s script.",
    note: "CreatorVault founding circle · public creator source",
    profileUrl: "https://www.tiktok.com/@princesadeafrica",
    platformLabel: "Find her on TikTok",
    image: "/images/creator-pages/leslie-public-source.jpg",
    imagePosition: "center",
    motionChapters: [
      { src: "/videos/creator-pages/leslie-travel-escape.mp4", eyebrow: "01 · Escape", title: "HER LIFE OPENS UP OUTSIDE.", feeling: "Travel footage that makes her world feel wider than a profile card." },
      { src: "/videos/creator-pages/leslie-nature-flow.mp4", eyebrow: "02 · Green space", title: "SHE FINDS THE QUIET THAT MOVES HER.", feeling: "A visual diary chapter shaped by the places she chooses to disappear into." },
      { src: "/videos/creator-pages/leslie-island-motion.mp4", eyebrow: "03 · Island motion", title: "THE VIEW IS PART OF THE FEELING.", feeling: "Real Caribbean landscape motion that gives her social world a sense of place." },
    ],
    colors: { ink: "#091117", glow: "#4bd8dd", wash: "#baf6f5", edge: "#dcffff" },
    status: "feature",
  },
  {
    slug: "delbania",
    name: "DelBania",
    handle: "@delbanianailsbar05",
    line: "Hands, detail, and the life she is building.",
    world: "HER DETAIL IS THE DIFFERENCE.",
    pulse: "Beauty work, personal taste, and a creator identity being brought into its own real CreatorVault world.",
    note: "CreatorVault founding circle · verified public identity",
    profileUrl: "https://www.tiktok.com/@delbanianailsbar05",
    platformLabel: "Find her on TikTok",
    motionChapters: [
      { src: "/videos/creator-pages/delbania-salon-life.mp4", eyebrow: "01 · Salon life", title: "THE DETAIL STARTS BEFORE THE FINAL SET.", feeling: "A real behind-the-scenes personal moment from the beauty world she is building." },
    ],
    colors: { ink: "#1a070d", glow: "#ff7daa", wash: "#ffc4d8", edge: "#ffe0eb" },
    status: "roster",
  },
  {
    slug: "lirys",
    name: "Lirys Twin Rodriguez",
    handle: "Lirys Twin",
    line: "Her story gets its own room.",
    world: "SHE DOES NOT NEED A TEMPLATE.",
    pulse: "A founding-circle identity that will be shaped from her own material, in her own time, with no borrowed face attached to it.",
    note: "CreatorVault founding circle",
    colors: { ink: "#17100a", glow: "#e7b66d", wash: "#f8d9a8", edge: "#fff0d6" },
    status: "roster",
  },
  {
    slug: "canisha",
    name: "Canisha",
    handle: "Canisha",
    line: "Her name. Her room. Her rules.",
    world: "SHE GETS TO SET THE TEMPERATURE.",
    pulse: "Live music, intimate performance, and a real voice that already gives her world its own temperature.",
    note: "CreatorVault founding circle · public creator source",
    profileUrl: "https://www.instagram.com/canisha.ck/",
    motionChapters: [
      { src: "/videos/creator-pages/canisha-live-stage.mp4", eyebrow: "01 · Live room", title: "HER VOICE CHANGES THE ROOM.", feeling: "An intimate real performance with stage light, breath, and presence you cannot fake." },
      { src: "/videos/creator-pages/canisha-studio-teaser.mp4", eyebrow: "02 · Studio pulse", title: "THE NEXT SONG STARTS HERE.", feeling: "A creator-world chapter built around process, sound, and what is coming next." },
      { src: "/videos/creator-pages/canisha-celebration-motion.mp4", eyebrow: "03 · Her day", title: "THE MOMENT DESERVES A SOUNDTRACK.", feeling: "A personal celebration chapter that makes the performance world feel human." },
    ],
    colors: { ink: "#081615", glow: "#62d5b4", wash: "#b8f2df", edge: "#ddfff3" },
    status: "roster",
  },
  {
    slug: "marielka",
    name: "Marielka",
    handle: "Marielka",
    line: "A world built around what is real.",
    world: "SHE IS NOT HERE TO BLEND IN.",
    pulse: "A founding-circle identity ready to become a real creator world through her own presence, not somebody else’s imagery.",
    note: "CreatorVault founding circle",
    colors: { ink: "#110c1e", glow: "#c89cff", wash: "#e6d1ff", edge: "#f5ebff" },
    status: "roster",
  },
];

function CreatorVisual({ creator, hero = false }: { creator: Creator; hero?: boolean }) {
  if (creator.video) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" poster={creator.image}>
          <source src={creator.video} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/5" />
      </div>
    );
  }

  if (creator.image) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={creator.image}
          alt={`${creator.name} public creator source`}
          className="h-full w-full object-cover creator-page-image"
          style={{ objectPosition: creator.imagePosition || "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
        <div className="absolute inset-0 opacity-60 mix-blend-screen creator-page-glow" style={{ background: `radial-gradient(circle at 65% 20%, ${creator.colors.glow} 0%, transparent 46%)` }} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `radial-gradient(circle at 22% 14%, ${creator.colors.glow} 0%, transparent 31%), linear-gradient(135deg, ${creator.colors.ink}, #050507 70%)` }}>
      <div className="absolute -left-16 top-10 h-56 w-56 rounded-full blur-3xl creator-page-orb" style={{ backgroundColor: creator.colors.glow }} />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full blur-3xl creator-page-orb-reverse" style={{ backgroundColor: creator.colors.wash }} />
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="select-none text-[34vw] font-black leading-none tracking-[-0.14em] text-white/[0.08]">{creator.name.charAt(0)}</span>
      </div>
    </div>
  );
}

function HandleRow({ creator }: { creator: Creator }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/70">
      <span>{creator.handle}</span>
      {creator.handles?.map((handle) => <span key={handle} className="text-white/45">{handle}</span>)}
    </div>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link href={`/creators/${creator.slug}`}>
      <a className="group relative block min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0c10] shadow-[0_30px_70px_rgba(0,0,0,0.34)] transition duration-500 hover:-translate-y-1 hover:border-white/30">
        <CreatorVisual creator={creator} />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute left-5 top-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
          <span className="h-1.5 w-1.5 rounded-full creator-page-dot" style={{ backgroundColor: creator.colors.glow }} /> Founding circle
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">{creator.handle}</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">{creator.name}</h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/76">{creator.line}</p>
          <div className="mt-5 flex items-center gap-2 text-sm font-black text-white">Step into her world <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></div>
        </div>
      </a>
    </Link>
  );
}

export function FoundingCreatorsRoster() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070709] text-white">
      <style>{`@keyframes creatorFloat{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(0,-16px,0) scale(1.035)}}@keyframes creatorFloatReverse{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(0,20px,0) scale(1.06)}}@keyframes creatorSweep{0%{transform:translateX(-120%) rotate(18deg)}100%{transform:translateX(160%) rotate(18deg)}}@keyframes creatorPulse{0%,100%{opacity:.45;transform:scale(.9)}50%{opacity:1;transform:scale(1.2)}}.creator-page-image{animation:creatorFloat 12s ease-in-out infinite}.creator-page-glow{animation:creatorSweep 9s ease-in-out infinite}.creator-page-orb{animation:creatorFloat 7s ease-in-out infinite}.creator-page-orb-reverse{animation:creatorFloatReverse 9s ease-in-out infinite}.creator-page-dot{animation:creatorPulse 1.8s ease-in-out infinite}`}</style>
      <section className="relative isolate min-h-[82vh] overflow-hidden border-b border-white/10 px-5 pb-16 pt-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 84% 10%, #ff5d9280 0%, transparent 25%), radial-gradient(circle at 18% 88%, #54d6ff55 0%, transparent 31%), linear-gradient(145deg, #09070a 0%, #151018 54%, #050507 100%)" }} />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/"><a className="text-lg font-black tracking-[-0.05em]">CREATOR<span className="text-[#ff5d92]">VAULT</span></a></Link>
          <Link href="/vault-x"><a className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/90 transition hover:bg-white/10">Enter VaultX</a></Link>
        </div>
        <div className="relative mx-auto grid max-w-7xl items-end gap-10 pb-6 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:pt-28">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#ffc0d7]"><Crown className="h-4 w-4" /> CreatorVault founding circle</div>
            <h1 className="mt-6 text-5xl font-black leading-[.92] tracking-[-0.08em] sm:text-7xl lg:text-8xl">THE WOMEN WHO <span className="text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,.7)" }}>MOVE</span> THE CULTURE.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/72">Not a fake roster. Not a stock-photo marketplace. Real women. Real public identities. Real CreatorVault worlds built around the energy they already own.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#the-circle" className="rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-[1.02]">Meet the circle</a>
              <Link href="/creators/reshula"><a className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-black transition hover:bg-white/10">Start with Reshula</a></Link>
            </div>
          </div>
          <div className="relative min-h-[330px] overflow-hidden rounded-[2rem] border border-white/15 bg-[#10080d] shadow-2xl sm:min-h-[470px]">
            <CreatorVisual creator={creators[0]} hero />
            <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Now inside the circle</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.07em]">Paola ReShula</h2>
              <p className="mt-2 text-sm font-semibold text-white/78">Her actual CreatorVault-approved motion is setting the tone.</p>
            </div>
          </div>
        </div>
      </section>
      <section id="the-circle" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff9bc0]">The founding circle</p><h2 className="mt-3 text-4xl font-black tracking-[-0.07em] sm:text-6xl">EVERY PAGE HAS A WOMAN BEHIND IT.</h2></div>
          <p className="max-w-sm text-sm leading-6 text-white/55">Each world keeps her real name, real handle, and real creator material. No invented success stories. No borrowed face.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{creators.map((creator) => <CreatorCard key={creator.slug} creator={creator} />)}</div>
      </section>
      <section className="border-t border-white/10 bg-white/[0.03] px-5 py-16 text-center sm:px-8"><Sparkles className="mx-auto h-5 w-5 text-[#ff94be]" /><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-[-0.06em] sm:text-5xl">THE PLATFORM GETS POWERFUL WHEN THE WOMEN INSIDE IT LOOK LIKE THEMSELVES.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/60">CreatorVault is building with the women who made the first vision matter.</p></section>
    </main>
  );
}

export function FoundingCreatorPage() {
  const [location] = useLocation();
  const creatorSlug = location.split("/").filter(Boolean).at(-1) || "";
  const canonicalCreatorSlug = creatorSlug === "luv-roxie" ? "the-biggest-b" : creatorSlug;
  const creator = creators.find((item) => item.slug === canonicalCreatorSlug);
  if (!creator) return <FoundingCreatorsRoster />;
  return (
    <main className="min-h-screen overflow-hidden text-white" style={{ backgroundColor: creator.colors.ink }}>
      <style>{`@keyframes creatorFloat{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(0,-16px,0) scale(1.035)}}@keyframes creatorFloatReverse{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(0,20px,0) scale(1.06)}}@keyframes creatorSweep{0%{transform:translateX(-120%) rotate(18deg)}100%{transform:translateX(160%) rotate(18deg)}}@keyframes creatorPulse{0%,100%{opacity:.45;transform:scale(.9)}50%{opacity:1;transform:scale(1.2)}}.creator-page-image{animation:creatorFloat 12s ease-in-out infinite}.creator-page-glow{animation:creatorSweep 9s ease-in-out infinite}.creator-page-orb{animation:creatorFloat 7s ease-in-out infinite}.creator-page-orb-reverse{animation:creatorFloatReverse 9s ease-in-out infinite}.creator-page-dot{animation:creatorPulse 1.8s ease-in-out infinite}`}</style>
      <section className="relative isolate min-h-screen overflow-hidden">
        <CreatorVisual creator={creator} hero />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-8"><Link href="/creators"><a className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] backdrop-blur-md transition hover:bg-black/55"><ArrowLeft className="h-3.5 w-3.5" /> The circle</a></Link><Link href="/"><a className="text-lg font-black tracking-[-0.05em]">CREATOR<span style={{ color: creator.colors.glow }}>VAULT</span></a></Link></div>
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-end px-5 pb-12 pt-32 sm:px-8 sm:pb-20 lg:px-12">
          <div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/75"><span className="h-1.5 w-1.5 rounded-full creator-page-dot" style={{ backgroundColor: creator.colors.glow }} /> {creator.note}</div><HandleRow creator={creator} /><h1 className="mt-5 text-6xl font-black leading-[.88] tracking-[-0.09em] sm:text-8xl lg:text-9xl">{creator.name}</h1><p className="mt-6 max-w-xl text-xl font-semibold leading-8 text-white/85 sm:text-2xl">{creator.line}</p><div className="mt-8 flex flex-wrap gap-3">{creator.profileUrl && <a href={creator.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black text-black transition hover:scale-[1.02]" style={{ backgroundColor: creator.colors.wash }}>{creator.platformLabel || "Find her on Instagram"} <ArrowUpRight className="h-4 w-4" /></a>}<Link href="/vault-x"><a className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-6 py-3 text-sm font-black backdrop-blur-md transition hover:bg-black/45"><Video className="h-4 w-4" /> Enter VaultX</a></Link></div></div>
        </div>
      </section>
      {creator.publicPresence && creator.publicPresence.length > 0 && (
        <section className="border-t border-white/10 bg-black px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-3">{creator.publicPresence.map((presence) => <a key={presence.href} href={presence.href} target="_blank" rel="noreferrer" className="group rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:bg-white/[0.08]"><p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: creator.colors.glow }}>{presence.label}</p><div className="mt-3 flex items-center justify-between gap-3"><p className="text-lg font-black tracking-[-0.04em]">{presence.handle}</p><ArrowUpRight className="h-4 w-4 text-white/60 transition group-hover:rotate-45" /></div><p className="mt-2 text-xs leading-5 text-white/60">{presence.proof}</p></a>)}</div></section>
      )}
      {creator.creatorVaultHorizon && (
        <section className="relative overflow-hidden border-t border-white/10 bg-[#11160b] px-5 py-16 sm:px-8 lg:px-12"><div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 15% 15%, ${creator.colors.glow}55, transparent 26%), linear-gradient(120deg, transparent, ${creator.colors.wash}16)` }} /><div className="relative mx-auto max-w-7xl"><div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: creator.colors.glow }}>Modeled CreatorVault upside · not current earnings</p><h2 className="mt-3 max-w-3xl text-4xl font-black leading-[.9] tracking-[-0.07em] sm:text-6xl">{creator.creatorVaultHorizon.title}</h2><p className="mt-6 max-w-2xl text-sm leading-7 text-white/70">{creator.creatorVaultHorizon.context}</p><div className="mt-6 flex flex-wrap gap-2">{creator.creatorVaultHorizon.pillars.map((pillar) => <span key={pillar} className="rounded-full border border-white/15 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/75">{pillar}</span>)}</div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><div className="rounded-[1.75rem] border border-white/15 bg-black/35 p-6"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Original Year 1 gross model</p><p className="mt-3 text-4xl font-black tracking-[-0.07em]" style={{ color: creator.colors.glow }}>{creator.creatorVaultHorizon.gross}</p><p className="mt-3 text-sm leading-6 text-white/62">Model scenario only. It begins after the creator’s content, offers, routes, and fan machine are actually live together.</p></div><div className="rounded-[1.75rem] border border-white/15 bg-white/[0.06] p-6"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Original modeled creator share</p><p className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{creator.creatorVaultHorizon.share}</p><p className="mt-3 text-sm leading-6 text-white/62">Original 70% model share. This is separate from verified present-day account or membership earnings.</p></div></div></div></div></section>
      )}
      <section className="relative overflow-hidden border-t border-white/15 px-5 py-16 sm:px-8 lg:px-12" style={{ background: `linear-gradient(135deg, ${creator.colors.ink}, #070709)` }}>
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl opacity-40 creator-page-orb" style={{ backgroundColor: creator.colors.glow }} />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: creator.colors.wash }}>Her world, in her words</p><h2 className="mt-4 text-4xl font-black leading-[.95] tracking-[-0.07em] sm:text-6xl">{creator.world}</h2></div><p className="max-w-2xl text-lg leading-8 text-white/70">{creator.pulse}</p></div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12"><div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 sm:p-10"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: creator.colors.glow }}>CreatorVault founding circle</p><h2 className="mt-3 text-3xl font-black tracking-[-0.06em]">This is {creator.name}'s room.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-white/60">Her real material. Her real identity. Her own CreatorVault world. Nothing on this page is a fake client win or somebody else pretending to be her.</p></div><Link href="/creators"><a className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-white">Meet the whole circle <ChevronRight className="h-4 w-4" /></a></Link></div></div></section>
    </main>
  );
}
