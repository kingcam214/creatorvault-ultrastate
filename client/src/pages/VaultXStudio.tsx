import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, BadgeDollarSign, Camera, Check, Clapperboard, Crown, Film, Image, Library, Play, Settings, Sparkles, Upload, Wand2 } from "lucide-react";

const gold = "#C9A84C";

type NavItem = "make" | "edit" | "sell" | "earn" | "settings";
type MakeChoice = "Body Cinema" | "Clone Video" | "Promo Trailer" | "Photo Set";

type CardProps = {
  title: string;
  body: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
};

const makeChoices: { title: MakeChoice; body: string; icon: ReactNode; tag: string }[] = [
  {
    title: "Body Cinema",
    body: "Upload raw footage and turn it into a polished, sellable video built for adult creators.",
    icon: <Clapperboard size={26} />,
    tag: "Flagship",
  },
  {
    title: "Clone Video",
    body: "Use your trained look to produce creator content without starting from scratch.",
    icon: <Camera size={26} />,
    tag: "AI creator",
  },
  {
    title: "Promo Trailer",
    body: "Cut a high-energy teaser that pushes fans toward subscriptions and paid unlocks.",
    icon: <Film size={26} />,
    tag: "Sales clip",
  },
  {
    title: "Photo Set",
    body: "Build premium still content for posts, previews, bundles, and fan offers.",
    icon: <Image size={26} />,
    tag: "Visual pack",
  },
];

function TopNavButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-12 rounded-full px-4 py-3 text-sm font-black transition active:scale-[0.98] ${
        active ? "bg-[#C9A84C] text-black shadow-[0_0_30px_rgba(201,168,76,0.22)]" : "bg-[#141414] text-[#b8b8b8] hover:bg-[#1f1f1f] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PowerCard({ title, body, icon, active, onClick }: CardProps) {
  return (
    <button
      onClick={onClick}
      className={`min-h-52 rounded-[1.75rem] border p-5 text-left transition hover:-translate-y-1 active:scale-[0.98] ${
        active ? "border-[#C9A84C] bg-[#1f1a0c] shadow-[0_0_40px_rgba(201,168,76,0.12)]" : "border-[#252525] bg-[#141414] hover:border-[#C9A84C]"
      }`}
    >
      <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${active ? "bg-[#C9A84C] text-black" : "bg-black text-[#C9A84C]"}`}>{icon}</div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#999999]">{body}</p>
        </div>
        {active && <Check size={20} className="mt-1 text-[#C9A84C]" />}
      </div>
    </button>
  );
}

function HeroPreview({ choice }: { choice: MakeChoice }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#242424] bg-[#111] shadow-2xl shadow-black/50">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 md:p-10">
          <p className="mb-4 inline-flex rounded-full border border-[#C9A84C]/40 bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#C9A84C]">
            VaultX Studio
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight text-white md:text-6xl">
            One room to make premium adult creator content.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#b8b8b8]">
            Pick what you want to make. VaultX gives you serious production power behind a simple creator screen, with Body Cinema as the fast lane from raw footage to paid content.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/vaultx/editor" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-7 py-4 text-base font-black text-black transition hover:brightness-110 active:scale-[0.98]">
              Open Editor
              <ArrowRight size={18} />
            </Link>
            <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#333] bg-black px-7 py-4 text-base font-black text-white transition hover:border-[#C9A84C] hover:text-[#C9A84C] active:scale-[0.98]">
              <Upload size={18} />
              Upload Footage
            </button>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden border-t border-[#242424] bg-black lg:border-l lg:border-t-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,168,76,0.30),transparent_35%),linear-gradient(145deg,#090909,#1a1203_48%,#050505)]" />
          <div className="absolute inset-6 rounded-[1.75rem] border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="mb-3 text-sm font-black text-[#C9A84C]">Selected</p>
                <h2 className="text-3xl font-black text-white">{choice}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#b8b8b8]">Creator control in front. Serious video power underneath. No confusing production screen.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-4">
                <div className="mb-4 flex items-center justify-between text-sm font-bold text-[#999999]">
                  <span>Preview</span>
                  <span>Ready to build</span>
                </div>
                <div className="flex aspect-video items-center justify-center rounded-2xl bg-[#0a0a0a]">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C9A84C] text-black shadow-[0_0_60px_rgba(201,168,76,0.35)]">
                    <Play size={30} fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MakePanel({ selected, setSelected }: { selected: MakeChoice; setSelected: (value: MakeChoice) => void }) {
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">What are you making?</h2>
          <p className="mt-2 max-w-2xl text-[#999999]">Four clear doors. Each one opens serious creative power without making the creator manage complexity.</p>
        </div>
        <Link href="/vaultx/editor" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#C9A84C] bg-[#141414] px-5 py-3 text-sm font-black text-[#C9A84C] transition hover:bg-[#C9A84C] hover:text-black active:scale-[0.98]">
          Go to Editor
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {makeChoices.map((choice) => (
          <div key={choice.title} className="relative">
            <span className="absolute right-4 top-4 z-10 rounded-full bg-black px-3 py-1 text-xs font-black text-[#C9A84C]">{choice.tag}</span>
            <PowerCard title={choice.title} body={choice.body} icon={choice.icon} active={selected === choice.title} onClick={() => setSelected(choice.title)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function EditPanel() {
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <h2 className="text-3xl font-black text-white">Edit without the mess</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">The editor keeps the creator focused on the decisions that matter: trim, style, captions, price, and post.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Trim", "Cut the start and end fast, then keep the best part moving."],
          ["Style", "Choose a premium visual finish without needing technical settings."],
          ["Captions", "Add readable captions and clean promo lines for fan attention."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
            <Sparkles className="mb-4 text-[#C9A84C]" size={24} />
            <h3 className="text-xl font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#999999]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SellPanel() {
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <h2 className="text-3xl font-black text-white">Sell the moment it is ready</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">VaultX connects the creative room to the money room so finished content can drive subscribers, paid unlocks, and repeat buyers.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Free Preview", "Give fans a taste and lead them to the full version."],
          ["Subscribers", "Reward paying fans with premium access."],
          ["Paid Unlock", "Turn high-intent fans into direct buyers."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
            <BadgeDollarSign className="mb-4 text-[#C9A84C]" size={24} />
            <h3 className="text-xl font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#999999]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EarnPanel() {
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <h2 className="text-3xl font-black text-white">Know what is making money</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">The creator should know which clips bring subscribers, which previews convert, and which paid drops deserve a follow-up.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["$4,820", "Projected monthly sales from this content lane."],
          ["38%", "Preview-to-unlock rate target."],
          ["7", "Content drops ready for the next fan push."],
        ].map(([value, label]) => (
          <div key={label} className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
            <p className="text-3xl font-black text-[#C9A84C]">{value}</p>
            <p className="mt-2 text-sm leading-6 text-[#999999]">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel() {
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <h2 className="text-3xl font-black text-white">Creator controls</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">Keep the creator controls clear: profile, payout destination, posting defaults, content access, and fan messaging tone.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ["Posting defaults", "Choose the default preview, subscriber, and paid unlock behavior."],
          ["Brand voice", "Keep captions and promo text aligned with the creator's style."],
          ["Content access", "Control what fans see before and after they pay."],
          ["Payout view", "See where creator money is headed and what is pending."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
            <Settings className="mb-4 text-[#C9A84C]" size={24} />
            <h3 className="text-xl font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#999999]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function VaultXStudio() {
  const [nav, setNav] = useState<NavItem>("make");
  const [selectedMake, setSelectedMake] = useState<MakeChoice>("Body Cinema");

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/vault-x" className="text-2xl font-black tracking-tight text-white">
            Vault<span style={{ color: gold }}>X</span>
          </Link>
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:flex">
            <TopNavButton active={nav === "make"} onClick={() => setNav("make")}>Make Video</TopNavButton>
            <TopNavButton active={nav === "edit"} onClick={() => setNav("edit")}>Edit Video</TopNavButton>
            <TopNavButton active={nav === "sell"} onClick={() => setNav("sell")}>Sell It</TopNavButton>
            <TopNavButton active={nav === "earn"} onClick={() => setNav("earn")}>Money</TopNavButton>
            <TopNavButton active={nav === "settings"} onClick={() => setNav("settings")}>Settings</TopNavButton>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <HeroPreview choice={selectedMake} />

        <section className="grid gap-4 md:grid-cols-3">
          {[
            [<Crown size={24} />, "Studio-grade", "Built for creators and teams that need serious output with simple decisions."],
            [<Wand2 size={24} />, "Body Cinema", "The flagship path from raw footage to premium sellable content."],
            [<Library size={24} />, "Money connected", "Finished content moves directly toward subscribers and fan buyers."],
          ].map(([icon, title, body]) => (
            <div key={String(title)} className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-[#C9A84C]">{icon}</div>
              <h3 className="text-xl font-black text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#999999]">{body}</p>
            </div>
          ))}
        </section>

        {nav === "make" && <MakePanel selected={selectedMake} setSelected={setSelectedMake} />}
        {nav === "edit" && <EditPanel />}
        {nav === "sell" && <SellPanel />}
        {nav === "earn" && <EarnPanel />}
        {nav === "settings" && <SettingsPanel />}
      </div>
    </main>
  );
}
