import { ReactNode, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BadgeDollarSign, Camera, Check, Clapperboard, Crown, Film, Image, Library, Loader2, Play, RadioTower, Settings, ShieldCheck, Sparkles, Upload, Wand2, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const accent = "#F2B15B";

type NavItem = "make" | "edit" | "sell" | "earn" | "settings";
type MakeChoice = "Body Cinema" | "Clone Video" | "Promo Trailer" | "Photo Set";
type TelegramMode = "FAST" | "BOOST" | "FULL";

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
    body: "Route clone-powered media into the same VaultX package, artifact, and monetization spine.",
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

function moneyToCents(value: string) {
  const dollars = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

function isAssetReady(status?: string | null, videoUrl?: string | null) {
  const normalized = String(status || "").toLowerCase();
  return Boolean(videoUrl) || ["succeed", "success", "succeeded", "ready", "complete", "completed"].includes(normalized);
}

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
            Body Cinema turns raw desire into a controlled revenue weapon.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#b8b8b8]">
            VaultX is its own uncensored adult-business operating room: source intake, consent lock, AI trailer generation, sellable artifact, checkout, and distribution move as one connected machine.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#launch-console" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-7 py-4 text-base font-black text-black transition hover:brightness-110 active:scale-[0.98]">
              Open Body Cinema
              <ArrowRight size={18} />
            </a>
            <Link href="/vaultx/editor" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#333] bg-black px-7 py-4 text-base font-black text-white transition hover:border-[#C9A84C] hover:text-[#C9A84C] active:scale-[0.98]">
              <Film size={18} />
              Open Editor
            </Link>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden border-t border-[#242424] bg-black lg:border-l lg:border-t-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,168,76,0.30),transparent_35%),linear-gradient(145deg,#090909,#1a1203_48%,#050505)]" />
          <div className="absolute inset-6 rounded-[1.75rem] border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="mb-3 text-sm font-black text-[#C9A84C]">Selected lane</p>
                <h2 className="text-3xl font-black text-white">{choice}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#b8b8b8]">Adult creator control up front. Model orchestration, durable artifacts, monetization, and routing underneath.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-4">
                <div className="mb-4 flex items-center justify-between text-sm font-bold text-[#999999]">
                  <span>Production spine</span>
                  <span>Real workflow</span>
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
          <h2 className="text-3xl font-black text-white">Choose the launch lane</h2>
          <p className="mt-2 max-w-2xl text-[#999999]">Each lane now points into a real VaultX production path instead of a disconnected presentation card.</p>
        </div>
        <a href="#launch-console" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#C9A84C] bg-[#141414] px-5 py-3 text-sm font-black text-[#C9A84C] transition hover:bg-[#C9A84C] hover:text-black active:scale-[0.98]">
          Build package
          <ArrowRight size={16} />
        </a>
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

function StatusPill({ active, text }: { active: boolean; text: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{text}</span>;
}

function LaunchConsole({ selectedMake }: { selectedMake: MakeChoice }) {
  const utils = trpc.useUtils();
  const capability = trpc.vaultx.getLaunchCapabilityMatrix.useQuery(undefined, { retry: false, refetchInterval: 30000 });
  const [title, setTitle] = useState("VaultX premium trailer drop");
  const [teaserDescription, setTeaserDescription] = useState("A creator-owned premium teaser route built to turn one source asset into a cinematic preview, paid unlock, tracked fan click, follow-up, and VIP escalation lane.");
  const [sourceMediaUrl, setSourceMediaUrl] = useState("");
  const [price, setPrice] = useState("29.00");
  const [vipPrice, setVipPrice] = useState("79.00");
  const [telegramMode, setTelegramMode] = useState<TelegramMode>("BOOST");
  const [adultContentFlag, setAdultContentFlag] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const statusQuery = trpc.vaultx.getPackageAssetStatus.useQuery(
    { packageId: packageId || 1, jobId: jobId || undefined },
    { enabled: Boolean(packageId), retry: false, refetchInterval: packageId ? 7000 : false }
  );

  const createPackage = trpc.vaultx.createRevenuePackage.useMutation();
  const generateAsset = trpc.vaultx.generatePackageAsset.useMutation();
  const attachCheckout = trpc.vaultx.attachPackageCheckout.useMutation();
  const publishTelegram = trpc.vaultx.publishPackageTelegramRoute.useMutation();

  const providers = (capability.data as any)?.providers || [];
  const packageWorkflow = ((capability.data as any)?.workflows || []).find((workflow: any) => workflow.id === "vaultx-package-launch");
  const statusData = statusQuery.data as any;
  const assetReady = isAssetReady(statusData?.status, statusData?.videoUrl);
  const working = createPackage.isPending || generateAsset.isPending || attachCheckout.isPending || publishTelegram.isPending;

  const selectedContentType = useMemo(() => (selectedMake === "Photo Set" ? "photo" : "video") as "photo" | "video", [selectedMake]);

  const handleLaunch = async () => {
    if (!adultContentFlag || !consentConfirmed) {
      toast.error("VaultX requires adult-content opt-in and creator consent before launch.");
      return;
    }
    if (!sourceMediaUrl.trim()) {
      toast.error("Paste a real creator-owned source media URL before starting generation.");
      return;
    }
    const priceCents = moneyToCents(price);
    const vipPriceCents = moneyToCents(vipPrice);
    if (priceCents < 100) {
      toast.error("Set a package price of at least $1.00.");
      return;
    }

    try {
      const created = await createPackage.mutateAsync({
        title: title.trim(),
        contentType: selectedContentType,
        adultContentFlag,
        consentConfirmed,
        teaserDescription: teaserDescription.trim(),
        priceCents,
        vipPriceCents: vipPriceCents >= 100 ? vipPriceCents : undefined,
        telegramMode,
        sourceMediaUrl: sourceMediaUrl.trim(),
      });
      const newPackageId = Number((created as any).packageId);
      setPackageId(newPackageId);
      toast.success("Body Cinema package created. Starting provider-backed trailer generation now.");
      const generation = await generateAsset.mutateAsync({
        packageId: newPackageId,
        sourceMediaUrl: sourceMediaUrl.trim(),
        resolution: telegramMode === "FULL" ? "1080p" : "720p",
        length: telegramMode === "FULL" ? "8" : telegramMode === "BOOST" ? "6" : "5",
        mode: telegramMode === "FAST" ? "std" : "pro",
      });
      setJobId(String((generation as any).jobId || ""));
      await utils.vaultx.getLaunchCapabilityMatrix.invalidate();
      await statusQuery.refetch();
      toast.success("Body Cinema job is live and being tracked by VaultX artifacts.");
    } catch (error: any) {
      toast.error(error?.message || "VaultX launch failed.");
    }
  };

  const handleAttachCheckout = async () => {
    if (!packageId) return;
    try {
      const result = await attachCheckout.mutateAsync({ packageId });
      setCheckoutUrl((result as any).checkoutUrl || null);
      await utils.vaultx.getLaunchCapabilityMatrix.invalidate();
      toast.success("Checkout attached to the ready VaultX asset.");
    } catch (error: any) {
      toast.error(error?.message || "Checkout could not be attached.");
    }
  };

  const handlePublish = async () => {
    if (!packageId) return;
    try {
      await publishTelegram.mutateAsync({ packageId });
      await utils.vaultx.getLaunchCapabilityMatrix.invalidate();
      toast.success("VaultX Telegram route published with tracked campaign metadata.");
    } catch (error: any) {
      toast.error(error?.message || "Telegram route could not be published.");
    }
  };

  return (
    <section id="launch-console" className="rounded-[2rem] border border-[#C9A84C]/35 bg-[linear-gradient(135deg,#090909,#130f05_55%,#050505)] p-5 shadow-[0_0_60px_rgba(201,168,76,0.08)] md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-[#C9A84C]/40 bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#C9A84C]">Body Cinema command rail</p>
          <h2 className="text-3xl font-black text-white md:text-4xl">Build the adult trailer, paid unlock, and distribution route end to end.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#b8b8b8]">This command rail calls the live VaultX stack: package creation, provider-backed generation, artifact polling, Stripe checkout attachment, and Telegram route publishing. Locked lanes expose real configuration gaps instead of pretending to work.</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-black/70 p-4 text-sm">
          <p className="font-black text-white">Economics</p>
          <p className="mt-1 text-[#999999]">Creator keeps <span className="font-black text-[#C9A84C]">85%</span>. Platform fee is <span className="font-black text-[#C9A84C]">15%</span>.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {providers.map((provider: any) => (
          <div key={provider.id} className="rounded-[1.25rem] border border-[#242424] bg-black/65 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-black text-white">{provider.label}</p>
              <StatusPill active={Boolean(provider.configured)} text={provider.configured ? "LIVE" : "LOCKED"} />
            </div>
            <p className="text-xs leading-5 text-[#999999]">{provider.configured ? provider.capability : provider.unlockRequirement}</p>
          </div>
        ))}
      </div>

      {packageWorkflow?.blockers?.length ? (
        <div className="mb-6 rounded-[1.25rem] border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          <p className="font-black text-white">Launch blockers detected</p>
          <p className="mt-1">{packageWorkflow.blockers.join(" • ")}</p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.5rem] border border-[#242424] bg-black p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9A84C] text-black"><Zap size={22} /></div>
            <div>
              <h3 className="text-2xl font-black text-white">Body Cinema intake</h3>
              <p className="text-sm text-[#999999]">Selected lane: {selectedMake}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
              Package title
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-12 rounded-2xl border border-[#242424] bg-[#101010] px-4 text-white outline-none focus:border-[#C9A84C]" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
              Real creator-owned source media URL
              <input value={sourceMediaUrl} onChange={(e) => setSourceMediaUrl(e.target.value)} className="min-h-12 rounded-2xl border border-[#242424] bg-[#101010] px-4 text-white outline-none focus:border-[#C9A84C]" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
              Teaser-to-unlock description
              <textarea value={teaserDescription} onChange={(e) => setTeaserDescription(e.target.value)} rows={4} className="rounded-2xl border border-[#242424] bg-[#101010] px-4 py-3 text-white outline-none focus:border-[#C9A84C]" />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
                Price
                <input value={price} onChange={(e) => setPrice(e.target.value)} className="min-h-12 rounded-2xl border border-[#242424] bg-[#101010] px-4 text-white outline-none focus:border-[#C9A84C]" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
                VIP price
                <input value={vipPrice} onChange={(e) => setVipPrice(e.target.value)} className="min-h-12 rounded-2xl border border-[#242424] bg-[#101010] px-4 text-white outline-none focus:border-[#C9A84C]" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
                Route mode
                <select value={telegramMode} onChange={(e) => setTelegramMode(e.target.value as TelegramMode)} className="min-h-12 rounded-2xl border border-[#242424] bg-[#101010] px-4 text-white outline-none focus:border-[#C9A84C]">
                  <option value="FAST">FAST</option>
                  <option value="BOOST">BOOST</option>
                  <option value="FULL">FULL</option>
                </select>
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-2xl border border-[#242424] bg-[#101010] p-4 text-sm leading-6 text-[#d6d6d6]">
              <input type="checkbox" checked={adultContentFlag} onChange={(e) => setAdultContentFlag(e.target.checked)} className="mt-1 h-5 w-5 accent-[#C9A84C]" />
              I confirm this package is for the VaultX adult vertical and should follow the platform's adult-content gating and launch rules.
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-[#242424] bg-[#101010] p-4 text-sm leading-6 text-[#d6d6d6]">
              <input type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} className="mt-1 h-5 w-5 accent-[#C9A84C]" />
              I confirm the creator owns or is authorized to use the source asset and consents to AI transformation, monetization, and distribution routing.
            </label>
            <button onClick={handleLaunch} disabled={working} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-7 py-4 text-base font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              {working ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              Ignite Body Cinema generation
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-[#242424] bg-black p-5">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="text-[#C9A84C]" />
              <h3 className="text-2xl font-black text-white">Live job status</h3>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[#b8b8b8]">
              <p>Package ID: <span className="font-black text-white">{packageId || "not created yet"}</span></p>
              <p>Provider job: <span className="font-black text-white">{jobId || "not started yet"}</span></p>
              <p>Asset status: <span className="font-black text-[#C9A84C]">{statusData?.status || "waiting"}</span></p>
              <p>Quality gate: <span className="font-black text-white">{statusData?.qualityPassed ? "passed" : "not passed yet"}</span></p>
            </div>
            {statusData?.videoUrl ? (
              <a href={statusData.videoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border border-[#C9A84C] px-5 py-3 text-sm font-black text-[#C9A84C] hover:bg-[#C9A84C] hover:text-black">
                Open ready asset
              </a>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-[#242424] bg-black p-5">
            <div className="mb-4 flex items-center gap-3">
              <BadgeDollarSign className="text-[#C9A84C]" />
              <h3 className="text-2xl font-black text-white">Monetize</h3>
            </div>
            <p className="text-sm leading-6 text-[#999999]">Checkout is only available after VaultX confirms a ready package artifact. No fake sales state is shown.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={handleAttachCheckout} disabled={!assetReady || attachCheckout.isPending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-50">
                {attachCheckout.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                Attach checkout
              </button>
              {checkoutUrl ? <a href={checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:border-[#C9A84C] hover:text-[#C9A84C]">Open checkout</a> : null}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#242424] bg-black p-5">
            <div className="mb-4 flex items-center gap-3">
              <RadioTower className="text-[#C9A84C]" />
              <h3 className="text-2xl font-black text-white">Distribute</h3>
            </div>
            <p className="text-sm leading-6 text-[#999999]">Telegram route publishing stays locked until the package has both a ready artifact and checkout URL.</p>
            <button onClick={handlePublish} disabled={!assetReady || !checkoutUrl || publishTelegram.isPending} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#C9A84C] px-5 py-3 text-sm font-black text-[#C9A84C] transition hover:bg-[#C9A84C] hover:text-black disabled:cursor-not-allowed disabled:opacity-50">
              {publishTelegram.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Publish tracked route
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditPanel() {
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <h2 className="text-3xl font-black text-white">Edit without losing the production spine</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">The editor should stay simple, but every action must point back to artifact-backed production: source, style, caption, package, checkout, and route.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Trim", "Keep the sales beat clean before sending the asset into the AI trailer lane."],
          ["Style", "Apply the premium VaultX visual law before generation and publishing."],
          ["Captions", "Shape promo copy around the paid unlock and VIP route mechanics."],
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
      <h2 className="text-3xl font-black text-white">Sell the moment the artifact is ready</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">VaultX connects creative output to package pricing, paid unlocks, checkout, and tracked distribution so creator content moves toward revenue immediately.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Free Preview", "The generated teaser becomes the attention layer."],
          ["Paid Unlock", "The ready package attaches to real checkout before publishing."],
          ["VIP Route", "The follow-up lane escalates buyers toward higher-value offers."],
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
  const capability = trpc.vaultx.getLaunchCapabilityMatrix.useQuery(undefined, { retry: false, refetchInterval: 30000 });
  const packages = ((capability.data as any)?.latestPackages || []) as any[];
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <h2 className="text-3xl font-black text-white">Know what is actually live</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">This view reads your latest VaultX revenue packages from the real backend instead of showing fantasy metrics.</p>
      <div className="mt-6 grid gap-4">
        {packages.length ? packages.map((pkg) => (
          <div key={pkg.id} className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-white">{pkg.title}</h3>
                <p className="mt-1 text-sm text-[#999999]">Mode {pkg.mode} • ${(pkg.priceCents / 100).toFixed(2)} • {pkg.assetStatus || pkg.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill active={pkg.hasAsset} text={pkg.hasAsset ? "ASSET" : "NO ASSET"} />
                <StatusPill active={pkg.hasCheckout} text={pkg.hasCheckout ? "CHECKOUT" : "NO CHECKOUT"} />
                <StatusPill active={pkg.hasTelegramRoute} text={pkg.hasTelegramRoute ? "ROUTE" : "NO ROUTE"} />
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-[1.5rem] border border-[#242424] bg-[#141414] p-5 text-sm leading-6 text-[#999999]">Create a VaultX package in the Launch Console and it will appear here with real artifact, checkout, and route status.</div>
        )}
      </div>
    </section>
  );
}

function SettingsPanel() {
  const capability = trpc.vaultx.getLaunchCapabilityMatrix.useQuery(undefined, { retry: false });
  const monetization = (capability.data as any)?.monetization;
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <h2 className="text-3xl font-black text-white">Creator controls and launch readiness</h2>
      <p className="mt-2 max-w-2xl text-[#999999]">VaultX keeps the creator-facing controls clear while exposing the real launch dependencies behind the scenes.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ["Stripe checkout", monetization?.stripeConfigured ? "Configured for paid unlock attachment." : "Locked until Stripe server credentials are configured."],
          ["Telegram distribution", monetization?.telegramConfigured ? "Configured for tracked route publishing." : "Locked until Telegram bot/channel configuration is complete."],
          ["Creator profile", (capability.data as any)?.creatorReady ? "Creator profile is ready for package ownership." : "Create or repair the creator profile before launch."],
          ["Provider honesty", "Runway and Kling are shown only as configured when real server credentials or confirmed provider routes exist."],
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
            Vault<span style={{ color: accent }}>X</span>
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
            [<Crown size={24} />, "Not CreatorVault", "A separate adult-business machine with its own command UX, language, and production rules."],
            [<Wand2 size={24} />, "Model rack aware", "Pollo, Replicate, clone, and premium lanes are surfaced according to real server configuration."],
            [<Library size={24} />, "Revenue armed", "Finished content moves directly toward checkout and tracked distribution when the artifact is ready."],
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
        <LaunchConsole selectedMake={selectedMake} />
      </div>
    </main>
  );
}
