import { ReactNode, useMemo, useState } from "react";
import { Link } from "wouter";
import { Captions, Check, DollarSign, FastForward, Play, Rewind, Sparkles, Upload } from "lucide-react";

const accent = "#F2B15B";

type EditorTab = "style" | "captions" | "publish";
type StyleChoice = "Natural" | "Warm & Bright" | "Cinematic" | "Bold & Dramatic";
type CaptionChoice = "Clean" | "Bold" | "Minimal";
type PriceChoice = "free" | "paid";
type AudienceChoice = "everyone" | "subscribers" | "unlock";

const styleChoices: { label: StyleChoice; glow: string; note: string }[] = [
  { label: "Natural", glow: "from-zinc-600 via-zinc-900 to-black", note: "True-to-camera color with clean skin and soft contrast." },
  { label: "Warm & Bright", glow: "from-amber-300 via-orange-700 to-black", note: "Glow, lift, and warm light for paid previews." },
  { label: "Cinematic", glow: "from-slate-400 via-zinc-900 to-black", note: "Deep contrast, rich shadows, and premium depth." },
  { label: "Bold & Dramatic", glow: "from-[#C9A84C] via-red-950 to-black", note: "High heat, strong contrast, and trailer-level energy." },
];

const captionChoices: CaptionChoice[] = ["Clean", "Bold", "Minimal"];

function UploadNewVideoButton() {
  return (
    <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#C9A84C] bg-[#141414] px-5 py-3 text-sm font-bold text-[#C9A84C] transition hover:bg-[#C9A84C] hover:text-black active:scale-[0.98]">
      <Upload size={18} />
      Upload New Video
    </button>
  );
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
        active
          ? "bg-[#C9A84C] text-black shadow-[0_0_28px_rgba(201,168,76,0.22)]"
          : "border border-[#2a2a2a] bg-[#141414] text-white hover:border-[#C9A84C] hover:text-[#C9A84C]"
      }`}
    >
      {children}
    </button>
  );
}

function VideoPreview() {
  const [shape, setShape] = useState<"wide" | "phone">("phone");
  const previewClass = shape === "wide" ? "aspect-video max-w-5xl" : "aspect-[9/16] max-w-[430px]";

  return (
    <section className="rounded-[2rem] border border-[#242424] bg-[#141414] p-4 shadow-2xl shadow-black/50 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 inline-flex rounded-full border border-[#C9A84C]/40 bg-black px-3 py-1 text-xs font-bold text-[#C9A84C]">
            Body Cinema editor
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">Cut the preview, arm the unlock, and move the fan toward purchase.</h1>
          <p className="mt-2 max-w-2xl text-base text-[#999999]">An adult-first editing cockpit for trailer pacing, caption control, paid preview logic, and launch routing.</p>
        </div>
        <div className="flex min-h-12 rounded-full border border-[#2a2a2a] bg-black p-1">
          <button
            onClick={() => setShape("phone")}
            className={`min-h-10 rounded-full px-4 text-sm font-bold transition ${shape === "phone" ? "bg-[#C9A84C] text-black" : "text-[#999999] hover:text-white"}`}
          >
            9:16
          </button>
          <button
            onClick={() => setShape("wide")}
            className={`min-h-10 rounded-full px-4 text-sm font-bold transition ${shape === "wide" ? "bg-[#C9A84C] text-black" : "text-[#999999] hover:text-white"}`}
          >
            16:9
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div className={`relative w-full overflow-hidden rounded-[1.5rem] border border-[#333] bg-black ${previewClass}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,168,76,0.24),transparent_34%),linear-gradient(135deg,#191919,#050505_55%,#1a1202)]" />
          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-[1.25rem] border border-white/10 bg-black/30 text-center backdrop-blur-sm">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#C9A84C] text-black shadow-[0_0_60px_rgba(201,168,76,0.35)]">
              <Play size={34} fill="currentColor" />
            </div>
            <p className="text-lg font-bold text-white">Body Cinema preview deck</p>
            <p className="mt-2 max-w-xs text-sm text-[#999999]">Load a creator-owned clip, shape the sales beat, and keep monetization attached to the edit.</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#242424] bg-black p-4">
        <div className="flex flex-wrap items-center justify-center gap-3 text-white">
          <button className="flex min-h-12 min-w-12 items-center justify-center rounded-full border border-[#333] bg-[#141414] transition hover:border-[#C9A84C] hover:text-[#C9A84C] active:scale-[0.98]" aria-label="Back">
            <Rewind size={20} />
          </button>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-8 py-3 font-black text-black transition hover:brightness-110 active:scale-[0.98]">
            <Play size={18} fill="currentColor" />
            Play
          </button>
          <button className="flex min-h-12 min-w-12 items-center justify-center rounded-full border border-[#333] bg-[#141414] transition hover:border-[#C9A84C] hover:text-[#C9A84C] active:scale-[0.98]" aria-label="Forward">
            <FastForward size={20} />
          </button>
          <span className="min-h-12 rounded-full border border-[#333] px-4 py-3 text-sm font-bold text-[#999999]">0:00 / 1:00</span>
        </div>
        <div className="mt-4 h-3 rounded-full bg-[#252525]">
          <div className="h-3 w-1/3 rounded-full bg-[#C9A84C]" />
        </div>
      </div>
    </section>
  );
}

function Timeline() {
  return (
    <section className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black text-white">Sales-beat timeline</h2>
        <p className="text-sm text-[#999999]">Trim around the unlock moment</p>
      </div>
      <div className="relative h-16 overflow-hidden rounded-2xl border border-[#333] bg-black p-2">
        <div className="grid h-full grid-cols-24 gap-1">
          {Array.from({ length: 24 }).map((_, index) => (
            <div key={index} className={`rounded ${index > 2 && index < 14 ? "bg-[#C9A84C]" : "bg-[#303030]"}`} />
          ))}
        </div>
        <div className="absolute left-[12%] top-1 h-[calc(100%-0.5rem)] w-2 rounded-full bg-white shadow-lg" />
        <div className="absolute left-[58%] top-1 h-[calc(100%-0.5rem)] w-2 rounded-full bg-white shadow-lg" />
      </div>
    </section>
  );
}

function StylePanel({ selected, setSelected }: { selected: StyleChoice; setSelected: (value: StyleChoice) => void }) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Choose the visual weapon</h2>
          <p className="mt-1 text-[#999999]">Pick the adult promo finish that matches the tease, the buyer intent, and the unlock value.</p>
        </div>
        <UploadNewVideoButton />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {styleChoices.map((choice) => (
          <button
            key={choice.label}
            onClick={() => setSelected(choice.label)}
            className={`min-h-48 rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-1 active:scale-[0.98] ${
              selected === choice.label ? "border-[#C9A84C] bg-[#1f1b10]" : "border-[#2a2a2a] bg-[#141414] hover:border-[#C9A84C]"
            }`}
          >
            <div className={`mb-4 h-24 rounded-2xl bg-gradient-to-br ${choice.glow}`} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-black text-white">{choice.label}</span>
              {selected === choice.label && <Check className="text-[#C9A84C]" size={20} />}
            </div>
            <p className="mt-2 text-sm text-[#999999]">{choice.note}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CaptionsPanel({ captionsOn, setCaptionsOn, style, setStyle }: { captionsOn: boolean; setCaptionsOn: (value: boolean) => void; style: CaptionChoice; setStyle: (value: CaptionChoice) => void }) {
  const lines = useMemo(() => ["New clip just dropped.", "Full version is inside my page.", "Tap to unlock it now."], []);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Write the conversion captions</h2>
          <p className="mt-1 text-[#999999]">Shape readable hooks that sell the preview without breaking the creator’s voice or consent lane.</p>
        </div>
        <UploadNewVideoButton />
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
          <p className="mb-3 text-sm font-bold text-white">Captions</p>
          <div className="grid grid-cols-2 gap-3">
            <ToggleButton active={captionsOn} onClick={() => setCaptionsOn(true)}>On</ToggleButton>
            <ToggleButton active={!captionsOn} onClick={() => setCaptionsOn(false)}>Off</ToggleButton>
          </div>
          <p className="mb-3 mt-6 text-sm font-bold text-white">Style</p>
          <div className="grid gap-3">
            {captionChoices.map((choice) => (
              <ToggleButton key={choice} active={style === choice} onClick={() => setStyle(choice)}>{choice}</ToggleButton>
            ))}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
          <div className="mb-4 flex items-center gap-2 text-white">
            <Captions size={20} className="text-[#C9A84C]" />
            <p className="text-sm font-bold">Edit each line</p>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <label key={line} className="block">
                <span className="mb-2 block text-xs font-bold text-[#999999]">Line {index + 1}</span>
                <input
                  defaultValue={line}
                  className="min-h-12 w-full rounded-2xl border border-[#333] bg-black px-4 py-3 text-white outline-none transition focus:border-[#C9A84C]"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishPanel({ priceChoice, setPriceChoice, audience, setAudience }: { priceChoice: PriceChoice; setPriceChoice: (value: PriceChoice) => void; audience: AudienceChoice; setAudience: (value: AudienceChoice) => void }) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Where does the money route go?</h2>
          <p className="mt-1 text-[#999999]">Connect the edited asset to free preview, subscriber value, or paid unlock so the output leaves with a revenue purpose.</p>
        </div>
        <UploadNewVideoButton />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
          <h3 className="mb-4 text-lg font-black text-white">Price</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleButton active={priceChoice === "free"} onClick={() => setPriceChoice("free")}>Free</ToggleButton>
            <button
              onClick={() => setPriceChoice("paid")}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
                priceChoice === "paid" ? "bg-[#C9A84C] text-black" : "border border-[#2a2a2a] bg-black text-white hover:border-[#C9A84C] hover:text-[#C9A84C]"
              }`}
            >
              <DollarSign size={18} />
              Set a price
            </button>
          </div>
          <input
            aria-label="Content price"
            className="mt-4 min-h-12 w-full rounded-2xl border border-[#333] bg-black px-4 py-3 text-white outline-none transition focus:border-[#C9A84C]"
          />
        </div>
        <div className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
          <h3 className="mb-4 text-lg font-black text-white">Who can see it?</h3>
          <div className="grid gap-3">
            <ToggleButton active={audience === "everyone"} onClick={() => setAudience("everyone")}>Everyone</ToggleButton>
            <ToggleButton active={audience === "subscribers"} onClick={() => setAudience("subscribers")}>Subscribers only</ToggleButton>
            <ToggleButton active={audience === "unlock"} onClick={() => setAudience("unlock")}>Paid unlock</ToggleButton>
          </div>
        </div>
      </div>
      <button className="mt-5 min-h-14 w-full rounded-2xl bg-[#C9A84C] px-6 py-4 text-lg font-black text-black shadow-[0_0_40px_rgba(201,168,76,0.22)] transition hover:brightness-110 active:scale-[0.99]">
        ARM THE DROP
      </button>
    </div>
  );
}

export default function VaultXEditor() {
  const [activeTab, setActiveTab] = useState<EditorTab>("style");
  const [selectedStyle, setSelectedStyle] = useState<StyleChoice>("Warm & Bright");
  const [captionsOn, setCaptionsOn] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionChoice>("Clean");
  const [priceChoice, setPriceChoice] = useState<PriceChoice>("paid");
  const [audience, setAudience] = useState<AudienceChoice>("unlock");

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/vault-x" className="text-2xl font-black tracking-tight text-white">
            Vault<span style={{ color: accent }}>X</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/vaultx/fan-library" className="min-h-12 rounded-full px-4 py-3 text-sm font-bold text-[#999999] transition hover:bg-[#141414] hover:text-white">
              My Videos
            </Link>
            <Link href="/vaultx/creator-subscriptions" className="min-h-12 rounded-full px-4 py-3 text-sm font-bold text-[#999999] transition hover:bg-[#141414] hover:text-white">
              Earn
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <VideoPreview />
        <Timeline />

        <section className="rounded-[2rem] border border-[#242424] bg-black p-4 md:p-6">
          <div className="mb-6 grid gap-2 rounded-[1.25rem] border border-[#242424] bg-[#141414] p-2 md:grid-cols-3">
            <button
              onClick={() => setActiveTab("style")}
              className={`min-h-12 rounded-2xl px-4 py-3 font-black transition active:scale-[0.98] ${activeTab === "style" ? "bg-[#C9A84C] text-black" : "text-white hover:bg-[#1d1d1d]"}`}
            >
              Style
            </button>
            <button
              onClick={() => setActiveTab("captions")}
              className={`min-h-12 rounded-2xl px-4 py-3 font-black transition active:scale-[0.98] ${activeTab === "captions" ? "bg-[#C9A84C] text-black" : "text-white hover:bg-[#1d1d1d]"}`}
            >
              Captions
            </button>
            <button
              onClick={() => setActiveTab("publish")}
              className={`min-h-12 rounded-2xl px-4 py-3 font-black transition active:scale-[0.98] ${activeTab === "publish" ? "bg-[#C9A84C] text-black" : "text-white hover:bg-[#1d1d1d]"}`}
            >
              Publish
            </button>
          </div>

          {activeTab === "style" && <StylePanel selected={selectedStyle} setSelected={setSelectedStyle} />}
          {activeTab === "captions" && <CaptionsPanel captionsOn={captionsOn} setCaptionsOn={setCaptionsOn} style={captionStyle} setStyle={setCaptionStyle} />}
          {activeTab === "publish" && <PublishPanel priceChoice={priceChoice} setPriceChoice={setPriceChoice} audience={audience} setAudience={setAudience} />}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Adult-first edit flow", "Trim, style, caption, price, and route the clip without falling back into generic creator tools."],
            ["Paid unlock logic", "Free preview, subscriber post, or paid unlock are always one tap away."],
            ["Body Cinema handoff", "Send raw footage to the flagship AI room when you want the system to build the finished cut."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
              <Sparkles className="mb-3 text-[#C9A84C]" size={22} />
              <p className="text-lg font-black text-white">{title}</p>
              <p className="mt-2 text-sm text-[#999999]">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
