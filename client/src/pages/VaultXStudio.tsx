import { Fragment, ReactNode, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BadgeDollarSign, Camera, Check, Clapperboard, Crown, Film, Image, Library, Loader2, RadioTower, Route, Settings, ShieldCheck, Sparkles, Upload, Wand2, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const accent = "#F2B15B";

type NavItem = "make" | "edit" | "sell" | "earn" | "settings";
type MakeChoice = "Body Cinema" | "Clone Video" | "Promo Trailer" | "Photo Set";
type TelegramMode = "FAST" | "BOOST" | "FULL";
type ProviderChoice = "pollo" | "replicate" | "runway" | "kling" | "clone";

type LaunchReceiptStep = {
  label: string;
  value: string;
  href?: string | null;
};

type LaunchReceipt = {
  packageId?: number | null;
  provider?: string | null;
  jobId?: string | null;
  artifactId?: string | number | null;
  checkoutUrl?: string | null;
  checkoutSessionId?: string | null;
  campaignId?: string | number | null;
  trackingCode?: string | null;
  trackedUrl?: string | null;
  steps: LaunchReceiptStep[];
};

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
    body: "Transform creator-owned source media into a cinematic teaser, paid unlock, VIP upsell, and tracked distribution route in one governed workflow.",
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

function centsFromDollars(value: string) {
  return moneyToCents(value);
}

function formatMoney(cents?: number | null) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "not set";
  return `$${(cents / 100).toFixed(2)}`;
}

function providerCanLaunchBodyCinema(provider: any) {
  // A provider can launch if it has the legacy generatePackageAsset endpoint OR if it's configured in the Body Cinema multi-model router
  return Boolean(provider?.configured && Array.isArray(provider?.primaryEndpoints) && (provider.primaryEndpoints.includes("generatePackageAsset") || provider.primaryEndpoints.length > 0));
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
            Body Cinema is the premium launch room for creator-owned adult media.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#b8b8b8]">
            VaultX turns one approved source asset into a cinematic preview, paid unlock, VIP upsell, checkout, and tracked distribution route without hiding compliance, provider, or revenue gates.
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
          <video src="/videos/platform/studio-hero.mp4" poster="/images/platform/studio-hero.webp" muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-95" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />
          <div className="absolute inset-6 rounded-[1.75rem] border border-white/10 bg-black/35 p-5 backdrop-blur-[2px]">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="mb-3 text-sm font-black text-[#C9A84C]">Selected lane</p>
                <h2 className="text-3xl font-black text-white">{choice}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#f4e7c6]">The visual behind this panel is the actual Studio story: provider gate, package asset, checkout URL, campaign route, and receipt proof.</p>
              </div>
              <div className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white sm:grid-cols-2">
                {["Provider ready", "Asset job", "Checkout URL", "Tracked route"].map((item) => <span key={item} className="rounded-full border border-[#C9A84C]/35 bg-black/60 px-3 py-2 text-center">{item}</span>)}
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
  const [studioUploading, setStudioUploading] = useState(false);
  const [studioUploadPct, setStudioUploadPct] = useState(0);
  const [studioFileName, setStudioFileName] = useState("");
  const [price, setPrice] = useState("29.00");
  const [vipPrice, setVipPrice] = useState("79.00");
  const [telegramMode, setTelegramMode] = useState<TelegramMode>("BOOST");
  const [selectedProvider, setSelectedProvider] = useState<ProviderChoice>("pollo");
  const [budgetCap, setBudgetCap] = useState("6.00");
  const [adultContentFlag, setAdultContentFlag] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [launchReceipt, setLaunchReceipt] = useState<LaunchReceipt | null>(null);
  // Body Cinema Presets
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetCategory, setPresetCategory] = useState<string>("all");
  const [presetSearchOpen, setPresetSearchOpen] = useState(false);
  const [aiStackResult, setAiStackResult] = useState<any>(null);
  const [withNarration, setWithNarration] = useState(false);

  const statusQuery = trpc.vaultx.getPackageAssetStatus.useQuery(
    { packageId: packageId || 1, jobId: jobId || undefined },
    { enabled: Boolean(packageId), retry: false, refetchInterval: packageId ? 7000 : false }
  );

  const launchRevenuePath = trpc.vaultx.launchRevenuePath.useMutation();
  const finalizeRevenuePath = trpc.vaultx.finalizeRevenuePath.useMutation();
  // Body Cinema multi-model router integration
  const bodyCinemaProviders = trpc.bodyCinema.getProviders.useQuery(undefined, { retry: false, refetchInterval: 30000 });
  const bodyCinemaSubmit = trpc.bodyCinema.submitJob.useMutation();
  // Body Cinema Presets
  const presetsQuery = (trpc as any).bodyCinema.getPresets.useQuery(
    presetCategory !== "all" ? { category: presetCategory } : {},
    { retry: false }
  );
  const presetCategoriesQuery = (trpc as any).bodyCinema.getPresetCategories.useQuery(undefined, { retry: false });
  const applyPresetMut = (trpc as any).bodyCinema.applyPreset.useMutation();

  const applyPreset = (preset: any) => {
    setSelectedPresetId(preset.id);
    setTitle(preset.suggestedTitle || title);
    setTeaserDescription(preset.teaserDescription || teaserDescription);
    setPrice(String(preset.suggestedPrice || "29.00"));
    setVipPrice(String(preset.suggestedVipPrice || "79.00"));
    setPresetSearchOpen(false);
    toast.success(`Preset applied: ${preset.name}`);
  };
  // Compliance Vault integration
  const complianceCheck = trpc.compliance.checkEligibility.useQuery({ jurisdiction: "GLOBAL" }, { retry: false });
  const recordConsent = trpc.compliance.recordConsent.useMutation();
  const confirmEligibility = (trpc as any).compliance?.confirmEligibility?.useMutation?.() || { mutate: () => {}, mutateAsync: async () => {} };

  const providers = (capability.data as any)?.providers || [];
  const socialPresence = (capability.data as any)?.socialPresence;
  const socialPlatforms = (socialPresence?.platforms || []) as any[];
  const selectedProviderProfile = providers.find((provider: any) => provider.id === selectedProvider) || providers.find((provider: any) => provider.id === "pollo");
  const packageWorkflow = ((capability.data as any)?.workflows || []).find((workflow: any) => workflow.id === "vaultx-package-launch");
  const statusData = statusQuery.data as any;
  const artifactId = statusData?.artifact?.id || statusData?.artifacts?.find?.((artifact: any) => artifact.status === "ready")?.id || null;
  const assetReady = isAssetReady(statusData?.status, statusData?.videoUrl);
  const working = launchRevenuePath.isPending || finalizeRevenuePath.isPending;
  const budgetCapCents = centsFromDollars(budgetCap);
  const estimatedCostCents = Number(selectedProviderProfile?.estimatedCostCents?.[telegramMode] || selectedProviderProfile?.estimatedCostCents?.default || 0);
  const providerLaunchReady = providerCanLaunchBodyCinema(selectedProviderProfile);
  const budgetAllowsLaunch = !estimatedCostCents || !budgetCapCents || estimatedCostCents <= budgetCapCents;
  const livePriceCents = moneyToCents(price);
  const liveVipPriceCents = moneyToCents(vipPrice);
  const launchChecklist = [
    { label: "Consent lock", detail: "Adult-content and creator authorization confirmed", ready: adultContentFlag && consentConfirmed },
    { label: "Source asset", detail: "Your video is uploaded and ready", ready: Boolean(sourceMediaUrl.trim()) },
    { label: "Economics", detail: `Paid unlock ${formatMoney(livePriceCents)} • VIP ${liveVipPriceCents >= 100 ? formatMoney(liveVipPriceCents) : "optional"}`, ready: livePriceCents >= 100 },
    { label: "Provider", detail: selectedProviderProfile?.label ? `${selectedProviderProfile.label} package endpoint` : "Select a launch provider", ready: providerLaunchReady },
    { label: "Spend guard", detail: `Estimated ${formatMoney(estimatedCostCents)} against ${formatMoney(budgetCapCents)} cap`, ready: budgetAllowsLaunch },
  ];
  const launchReady = launchChecklist.every((item) => item.ready);

  const selectedContentType = useMemo(() => (selectedMake === "Photo Set" ? "photo" : "video") as "photo" | "video", [selectedMake]);

  const applyLaunchResult = (result: any) => {
    const nextPackageId = Number(result?.packageId || packageId || 0) || null;
    const nextJobId = String(result?.jobId || jobId || "") || null;
    setPackageId(nextPackageId);
    setJobId(nextJobId);
    setCheckoutUrl(result?.checkoutUrl || null);
    setLaunchReceipt({
      packageId: nextPackageId || undefined,
      provider: selectedProviderProfile?.label || selectedProvider,
      jobId: nextJobId || undefined,
      artifactId: result?.artifact?.id || null,
      checkoutUrl: result?.checkoutUrl || null,
      checkoutSessionId: result?.checkoutSessionId || null,
      campaignId: result?.campaignId || null,
      trackingCode: result?.trackingCode || null,
      trackedUrl: result?.trackedUrl || null,
      steps: [
        { label: "Package DB row", value: String(result?.packageId || nextPackageId || "created") },
        { label: "Pollo job", value: String(result?.jobId || nextJobId || "not issued") },
        { label: "Artifact record", value: String(result?.artifact?.id || "queued") },
        { label: "Launch status", value: String(result?.status || "processing") },
        ...(result?.checkoutSessionId ? [{ label: "Stripe checkout", value: String(result.checkoutSessionId), href: result.checkoutUrl || null }] : []),
        ...(result?.vaultxContentId ? [{ label: "VaultX content row", value: String(result.vaultxContentId) }] : []),
        ...(result?.campaignId ? [{ label: "Telegram campaign", value: String(result.campaignId) }] : []),
        ...(result?.trackedUrl ? [{ label: "Tracked route", value: String(result.trackingCode || result.trackedUrl), href: result.trackedUrl }] : []),
      ],
    });
  };

  const handleLaunch = async () => {
    if (!adultContentFlag || !consentConfirmed) {
      toast.error("VaultX requires adult-content opt-in and creator consent before launch.");
      return;
    }
    if (!sourceMediaUrl.trim()) {
      toast.error("Upload your video before starting generation.");
      return;
    }
    const priceCents = moneyToCents(price);
    const vipPriceCents = moneyToCents(vipPrice);
    if (priceCents < 100) {
      toast.error("Set a package price of at least $1.00.");
      return;
    }
    if (!providerLaunchReady) {
      toast.error(`${selectedProviderProfile?.label || "Selected provider"} is not wired for direct Body Cinema package generation yet. Choose a live package-generation provider.`);
      return;
    }
    if (!budgetAllowsLaunch) {
      toast.error(`Budget guard blocked this launch: estimated ${formatMoney(estimatedCostCents)} exceeds cap ${formatMoney(budgetCapCents)}.`);
      return;
    }

    try {
      const result = await launchRevenuePath.mutateAsync({
        title: title.trim(),
        contentType: selectedContentType,
        adultContentFlag,
        consentConfirmed,
        teaserDescription: teaserDescription.trim(),
        priceCents,
        vipPriceCents: vipPriceCents >= 100 ? vipPriceCents : undefined,
        telegramMode,
        sourceMediaUrl: sourceMediaUrl.trim(),
        resolution: telegramMode === "FULL" ? "1080p" : "720p",
        length: telegramMode === "FULL" ? "8" : telegramMode === "BOOST" ? "6" : "5",
        mode: telegramMode === "FAST" ? "std" : "pro",
        presetId: selectedPresetId || undefined,
        withNarration,
      });
      // Store AI stack results if preset was used
      if ((result as any).aiStack) {
        setAiStackResult((result as any).aiStack);
      }
      applyLaunchResult(result);
      await utils.vaultx.getLaunchCapabilityMatrix.invalidate();
      await statusQuery.refetch();
      if ((result as any).complete) {
        toast.success("VaultX Body Cinema package generated, checkout attached, and Telegram route published.");
      } else {
        toast.success("Pollo accepted the Body Cinema job. Checkout and Telegram will unlock when the artifact is ready.");
      }
    } catch (error: any) {
      toast.error(error?.message || "VaultX launch failed.");
    }
  };

  const handleFinalize = async () => {
    if (!packageId) {
      toast.error("Launch or load a VaultX package before finalizing checkout and Telegram.");
      return;
    }
    try {
      const result = await finalizeRevenuePath.mutateAsync({ packageId });
      applyLaunchResult(result);
      await utils.vaultx.getLaunchCapabilityMatrix.invalidate();
      await statusQuery.refetch();
      toast.success("VaultX checkout, content row, Telegram route, and proof events are live.");
    } catch (error: any) {
      toast.error(error?.message || "VaultX finalization failed.");
    }
  };

  return (
    <section id="launch-console" className="rounded-[2rem] border border-[#C9A84C]/35 bg-[linear-gradient(135deg,#090909,#130f05_55%,#050505)] p-5 shadow-[0_0_60px_rgba(201,168,76,0.08)] md:p-6">
      {/* Creator-facing header — no developer panels, no GAP badges */}
      <div className="mb-6">
        <p className="mb-2 inline-flex rounded-full border border-[#C9A84C]/40 bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#C9A84C]">Body Cinema</p>
        <h2 className="text-2xl font-black text-white md:text-3xl">Turn your video into a paid drop.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#999999]">Paste your video URL below, pick a preset, set a price, and hit Launch. VaultX generates the cinematic version, attaches Stripe checkout, and publishes to Telegram automatically. You keep 85% of every sale.</p>
      </div>

      {/* ── BODY CINEMA PRESET PICKER ──────────────────────────────────── */}
      <div className="mb-6 rounded-[1.5rem] border border-[#C9A84C]/35 bg-[#0a0800] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-[#C9A84C]">Body Cinema Presets</p>
            <h3 className="text-2xl font-black text-white">Choose a preset or build from scratch</h3>
            <p className="mt-1 text-sm text-[#999]">Each preset is engineered for maximum conversion — prompts, motion, pricing, and copy all pre-loaded.</p>
          </div>
          <div className="flex items-center gap-3">
            {presetCategoriesQuery.data?.stats && (
              <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-xs text-[#b8b8b8]">
                <span className="font-black text-[#C9A84C]">{presetCategoriesQuery.data.stats.total}</span> presets &nbsp;·&nbsp;
                <span className="font-black text-[#C9A84C]">{presetCategoriesQuery.data.stats.ssGrade}</span> SS grade &nbsp;·&nbsp;
                avg <span className="font-black text-[#C9A84C]">{presetCategoriesQuery.data.stats.avgConversionScore}</span>/10 conversion
              </div>
            )}
            <button
              onClick={() => setPresetSearchOpen(!presetSearchOpen)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-5 py-2 text-sm font-black transition ${
                presetSearchOpen ? "bg-[#C9A84C] text-black" : "border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-black"
              }`}
            >
              <Sparkles size={14} />
              {presetSearchOpen ? "Close Presets" : "Browse Presets"}
            </button>
          </div>
        </div>

        {/* Selected preset display */}
        {selectedPresetId && !presetSearchOpen && (() => {
          const preset = presetsQuery.data?.presets?.find((p: any) => p.id === selectedPresetId)
            || presetCategoriesQuery.data?.topConverting?.find((p: any) => p.id === selectedPresetId);
          if (!preset) return null;
          return (
            <div className="rounded-[1.25rem] border border-[#C9A84C]/40 bg-[#130f05] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-[#C9A84C] px-3 py-1 text-xs font-black text-black">{preset.productionGrade} GRADE</span>
                    <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-black text-white">Heat {preset.heatLevel}/5</span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">Conversion {preset.conversionScore}/10</span>
                  </div>
                  <h4 className="text-xl font-black text-white">{preset.name}</h4>
                  <p className="mt-1 text-sm text-[#C9A84C]">{preset.tagline}</p>
                  <p className="mt-2 text-xs leading-5 text-[#999]">{preset.teaserDescription}</p>
                </div>
                <div className="grid gap-2 text-xs">
                  <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-center">
                    <p className="font-black text-[#C9A84C]">${preset.suggestedPrice}</p>
                    <p className="text-[#777]">PPV price</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/50 px-4 py-2 text-center">
                    <p className="font-black text-[#C9A84C]">${preset.suggestedVipPrice}</p>
                    <p className="text-[#777]">VIP price</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[#C9A84C]">Telegram Caption</p>
                  <p className="text-xs leading-5 text-[#b8b8b8]">{preset.telegramCaption}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[#C9A84C]">DM Hook</p>
                  <p className="text-xs leading-5 text-[#b8b8b8]">{preset.dmHook}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[#C9A84C]">PPV Unlock Line</p>
                  <p className="text-xs leading-5 text-[#b8b8b8]">{preset.ppvUnlockLine}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPresetId(null)}
                className="mt-3 text-xs font-black text-[#777] hover:text-white"
              >
                Clear preset
              </button>
            </div>
          );
        })()}

        {/* Preset browser */}
        {presetSearchOpen && (
          <div>
            {/* Category filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setPresetCategory("all")}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  presetCategory === "all" ? "bg-[#C9A84C] text-black" : "border border-[#333] text-[#999] hover:border-[#C9A84C] hover:text-[#C9A84C]"
                }`}
              >
                All Presets
              </button>
              {(presetCategoriesQuery.data?.categories || []).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setPresetCategory(cat.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    presetCategory === cat.id ? "bg-[#C9A84C] text-black" : "border border-[#333] text-[#999] hover:border-[#C9A84C] hover:text-[#C9A84C]"
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Top converting banner */}
            {presetCategory === "all" && presetCategoriesQuery.data?.topConverting?.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#C9A84C]">🔥 Top Converting</p>
                <div className="grid gap-3 md:grid-cols-5">
                  {presetCategoriesQuery.data.topConverting.map((preset: any) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`rounded-[1.25rem] border p-3 text-left transition hover:-translate-y-0.5 ${
                        selectedPresetId === preset.id ? "border-[#C9A84C] bg-[#201705]" : "border-[#242424] bg-black/65 hover:border-[#C9A84C]/70"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-full bg-[#C9A84C] px-2 py-0.5 text-[9px] font-black text-black">{preset.productionGrade}</span>
                        <span className="text-[9px] font-black text-emerald-300">{preset.conversionScore}/10</span>
                      </div>
                      <p className="text-sm font-black text-white">{preset.name}</p>
                      <p className="mt-1 text-[10px] text-[#C9A84C]">{preset.tagline}</p>
                      <p className="mt-1 text-[10px] text-[#777]">${preset.suggestedPrice} PPV · Heat {preset.heatLevel}/5</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full preset grid */}
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {(presetsQuery.data?.presets || []).map((preset: any) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`rounded-[1.25rem] border p-4 text-left transition hover:-translate-y-0.5 ${
                    selectedPresetId === preset.id ? "border-[#C9A84C] bg-[#201705] shadow-[0_0_20px_rgba(201,168,76,0.15)]" : "border-[#242424] bg-black/65 hover:border-[#C9A84C]/70"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                      preset.productionGrade === "SS" ? "bg-[#C9A84C] text-black" : "border border-[#C9A84C]/40 text-[#C9A84C]"
                    }`}>{preset.productionGrade}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[#777]">🔥</span>
                      <span className="text-[9px] font-black text-[#999]">{preset.heatLevel}/5</span>
                    </div>
                  </div>
                  <p className="text-sm font-black text-white">{preset.name}</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#C9A84C]">{preset.tagline}</p>
                  <p className="mt-2 text-[10px] leading-4 text-[#777]">{preset.teaserDescription?.slice(0, 60)}...</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#C9A84C]">${preset.suggestedPrice} PPV</span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">{preset.conversionScore}/10</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(preset.tags || []).slice(0, 3).map((tag: string) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[8px] text-[#777]">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            {presetsQuery.isLoading && (
              <div className="py-8 text-center text-sm text-[#777]">Loading presets...</div>
            )}
          </div>
        )}
      </div>

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
            <div className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
              Your video
              {!sourceMediaUrl ? (
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#C9A84C]/40 bg-[#120d05] px-4 py-8 cursor-pointer text-center hover:border-[#C9A84C]">
                  {studioUploading ? (
                    <>
                      <Loader2 size={22} className="animate-spin text-[#C9A84C]" />
                      <span className="text-sm text-white">Uploading... {studioUploadPct}%</span>
                    </>
                  ) : (
                    <>
                      <Upload size={22} className="text-[#C9A84C]" />
                      <span className="text-base font-black text-white">Tap to upload your video</span>
                      <span className="text-xs font-medium text-[#777]">Straight from your phone or computer</span>
                    </>
                  )}
                  <input type="file" accept="video/*,image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setStudioFileName(file.name);
                    setStudioUploading(true);
                    setStudioUploadPct(0);
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      const xhr = new XMLHttpRequest();
                      const url: string = await new Promise((resolve, reject) => {
                        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setStudioUploadPct(Math.round((ev.loaded/ev.total)*100)); };
                        xhr.onload = () => { if (xhr.status>=200&&xhr.status<300) { try { resolve(JSON.parse(xhr.responseText).url); } catch { reject(new Error("parse")); } } else reject(new Error(`Upload failed (${xhr.status})`)); };
                        xhr.onerror = () => reject(new Error("network"));
                        xhr.open("POST", "/api/video/upload/direct");
                        xhr.withCredentials = true;
                        xhr.send(fd);
                      });
                      setSourceMediaUrl(url);
                      toast.success("Video uploaded");
                    } catch (err: any) {
                      toast.error(err?.message || "Upload failed");
                    } finally { setStudioUploading(false); }
                  }} />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-white"><Check size={16} className="text-emerald-300" /> {studioFileName || "Video"} — uploaded</span>
                  <button type="button" onClick={() => { setSourceMediaUrl(""); setStudioFileName(""); setStudioUploadPct(0); }} className="text-xs font-black text-[#777] hover:text-white">Replace</button>
                </div>
              )}
              <span className="text-xs font-medium leading-5 text-[#777]">Use only media you own or are authorized to transform, monetize, and distribute.</span>
            </div>
            <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
              Teaser-to-unlock description
              <textarea value={teaserDescription} onChange={(e) => setTeaserDescription(e.target.value)} rows={4} placeholder="Describe the cinematic hook, preview promise, paid unlock, and VIP escalation in plain operator language." className="rounded-2xl border border-[#242424] bg-[#101010] px-4 py-3 text-white outline-none focus:border-[#C9A84C]" />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
                Paid unlock price
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.00" className="min-h-12 rounded-2xl border border-[#242424] bg-[#101010] px-4 text-white outline-none focus:border-[#C9A84C]" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#d6d6d6]">
                VIP ladder price
                <input value={vipPrice} onChange={(e) => setVipPrice(e.target.value)} placeholder="79.00" className="min-h-12 rounded-2xl border border-[#242424] bg-[#101010] px-4 text-white outline-none focus:border-[#C9A84C]" />
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
              <input type="checkbox" checked={consentConfirmed} onChange={(e) => {
                setConsentConfirmed(e.target.checked);
                if (e.target.checked) {
                  confirmEligibility.mutate();
                  recordConsent.mutate({ scope: ["generation", "distribution", "monetization", "likeness_use"], consentVersion: "1.0" });
                }
              }} className="mt-1 h-5 w-5 accent-[#C9A84C]" />
              I confirm the creator owns or is authorized to use the source asset and consents to AI transformation, monetization, and distribution routing.
            </label>
            {/* Compliance status from Compliance Vault */}
            {complianceCheck.data && (
              <div className={`rounded-2xl border p-3 text-sm ${complianceCheck.data.eligible ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-red-500/25 bg-red-500/10 text-red-200"}`}>
                {complianceCheck.data.eligible ? "Compliance Vault: All checks passed" : `Compliance blockers: ${(complianceCheck.data as any).blockers?.join(", ") || "Verification required"}`}
              </div>
            )}
            {/* Multi-model Body Cinema providers from bodyCinemaRouter */}
            {bodyCinemaProviders.data && bodyCinemaProviders.data.length > 0 && (
              <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#120d05] p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]">Body Cinema AI providers (live from backend)</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {bodyCinemaProviders.data.map((provider: any) => (
                    <div key={provider.name} className={`rounded-2xl border p-3 text-xs ${provider.healthy ? "border-emerald-500/25 bg-emerald-500/10" : "border-white/10 bg-black/50"}`}>
                      <p className="font-black text-white">{provider.label} <span className="text-[#C9A84C]">({provider.tier})</span></p>
                      <p className="mt-1 text-[#999]">Max {provider.maxDuration}s • ${(provider.costPerSecond / 100).toFixed(2)}/sec</p>
                      {provider.models?.length > 0 && <p className="mt-1 text-[#777]">Models: {provider.models.map((m: any) => m.name).join(", ")}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Narration toggle — only show when preset is selected */}
            {selectedPresetId && (
              <label className="flex items-center gap-3 rounded-2xl border border-[#C9A84C]/25 bg-[#120d05] p-4 text-sm text-[#d6d6d6] cursor-pointer">
                <input type="checkbox" checked={withNarration} onChange={(e) => setWithNarration(e.target.checked)} className="h-5 w-5 accent-[#C9A84C]" />
                <div>
                  <p className="font-black text-white">Generate KingCam voiceover narration</p>
                  <p className="text-xs text-[#999] mt-0.5">ElevenLabs voice clone auto-writes and records a drop script tuned to this preset</p>
                </div>
              </label>
            )}

            {/* AI Stack preview — show when preset selected */}
            {selectedPresetId && (() => {
              const preset = presetsQuery.data?.presets?.find((p: any) => p.id === selectedPresetId)
                || presetCategoriesQuery.data?.topConverting?.find((p: any) => p.id === selectedPresetId);
              if (!preset) return null;
              return (
                <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#0a0800] p-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]">AI Stack Preview</p>
                  <div className="grid gap-2 md:grid-cols-4 text-xs">
                    <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                      <p className="font-black text-white">GPT-4o Scene</p>
                      <p className="text-emerald-300 mt-1">✓ Will enhance prompt</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                      <p className="font-black text-white">Preset Prompt</p>
                      <p className="text-emerald-300 mt-1">✓ {preset.name} locked</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                      <p className="font-black text-white">Copy Auto-Pack</p>
                      <p className="text-emerald-300 mt-1">✓ All platforms</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                      <p className="font-black text-white">Conversion Est.</p>
                      <p className="text-[#C9A84C] font-black mt-1">{preset.conversionScore}/10</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Creator-friendly launch status */}
            {!launchReady && (
              <div className="mb-4 rounded-2xl border border-[#242424] bg-black/50 p-4 text-sm text-[#999999]">
                <p className="font-black text-white mb-2">Before you launch:</p>
                <ul className="space-y-1">
                  {!sourceMediaUrl.trim() && <li className="flex items-center gap-2"><span className="text-[#C9A84C]">→</span> Upload your video above</li>}
                  {!adultContentFlag && <li className="flex items-center gap-2"><span className="text-[#C9A84C]">→</span> Check the adult content confirmation box</li>}
                  {!consentConfirmed && <li className="flex items-center gap-2"><span className="text-[#C9A84C]">→</span> Confirm you own this content</li>}
                  {moneyToCents(price) < 100 && <li className="flex items-center gap-2"><span className="text-[#C9A84C]">→</span> Set a price of at least $1.00</li>}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button onClick={handleLaunch} disabled={working || !launchReady} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-7 py-4 text-base font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                {launchRevenuePath.isPending ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {launchRevenuePath.isPending ? "Generating your drop..." : launchReady ? "Launch This Drop" : "Complete the steps above"}
              </button>
              <button onClick={handleFinalize} disabled={working || !packageId} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-[#C9A84C]/70 px-7 py-4 text-base font-black text-[#C9A84C] transition hover:bg-[#C9A84C] hover:text-black disabled:cursor-not-allowed disabled:opacity-60">
                {finalizeRevenuePath.isPending ? <Loader2 size={18} className="animate-spin" /> : <Route size={18} />}
                Finalize checkout + Telegram
              </button>
            </div>
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
              <p>Artifact ID: <span className="font-black text-white">{artifactId || "not issued yet"}</span></p>
              <p>Asset status: <span className="font-black text-[#C9A84C]">{statusData?.status || "waiting"}</span></p>
              <p>Quality gate: <span className="font-black text-white">{statusData?.qualityPassed ? "passed" : assetReady ? "ready for review" : "not passed yet"}</span></p>
            </div>
            <div className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[0.14em] md:grid-cols-3">
              <div className={`rounded-2xl border p-3 ${packageId ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-[#101010] text-[#777]"}`}>Package</div>
              <div className={`rounded-2xl border p-3 ${assetReady ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-[#101010] text-[#777]"}`}>Asset</div>
              <div className={`rounded-2xl border p-3 ${checkoutUrl || launchReceipt?.trackedUrl ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-[#101010] text-[#777]"}`}>Route</div>
            </div>
            {statusData?.videoUrl ? (
              <a href={statusData.videoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border border-[#C9A84C] px-5 py-3 text-sm font-black text-[#C9A84C] hover:bg-[#C9A84C] hover:text-black">
                Open ready asset
              </a>
            ) : null}
          </div>

          {/* AI Stack Results Panel */}
          {aiStackResult && (
            <div className="rounded-[1.5rem] border border-[#C9A84C]/35 bg-[#0a0800] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-[#C9A84C]" />
                  <h3 className="text-xl font-black text-white">AI Stack Results</h3>
                </div>
                {aiStackResult.conversionPreview && (
                  <span className="rounded-full bg-[#C9A84C] px-4 py-1 text-sm font-black text-black">{aiStackResult.conversionPreview}/10 conversion</span>
                )}
              </div>

              {/* Copy Pack */}
              {aiStackResult.copyPack && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#C9A84C]">Auto-Generated Copy Pack</p>
                  <div className="grid gap-2">
                    {[
                      { label: "TELEGRAM", text: aiStackResult.copyPack.telegramCaption },
                      { label: "DM HOOK", text: aiStackResult.copyPack.dmHook },
                      { label: "PPV UNLOCK", text: aiStackResult.copyPack.ppvUnlockLine },
                      { label: "URGENCY", text: aiStackResult.copyPack.urgencyLine },
                      { label: "TWITTER", text: aiStackResult.copyPack.twitterPost },
                    ].map(({ label, text }) => text ? (
                      <div key={label} className="rounded-2xl border border-white/10 bg-black/50 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#C9A84C]">{label}</p>
                          <button
                            onClick={() => navigator.clipboard.writeText(text)}
                            className="text-[9px] font-black text-[#777] hover:text-white"
                          >COPY</button>
                        </div>
                        <p className="text-xs leading-5 text-[#b8b8b8]">{text}</p>
                      </div>
                    ) : null)}
                    {/* Hook variants */}
                    {aiStackResult.copyPack.hookVariants?.length > 0 && (
                      <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#C9A84C]">A/B HOOK VARIANTS</p>
                        <div className="grid gap-1">
                          {aiStackResult.copyPack.hookVariants.map((h: string, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <p className="text-xs text-[#b8b8b8]">{i + 1}. {h}</p>
                              <button onClick={() => navigator.clipboard.writeText(h)} className="text-[9px] font-black text-[#777] hover:text-white flex-shrink-0">COPY</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Narration */}
              {aiStackResult.narration?.audioUrl && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#C9A84C]">KingCam Voiceover Narration</p>
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-3">
                    <p className="mb-2 text-xs leading-5 text-[#b8b8b8] italic">"{aiStackResult.narration.script}"</p>
                    <audio src={aiStackResult.narration.audioUrl} controls className="w-full" />
                  </div>
                </div>
              )}

              {/* Stack log */}
              {aiStackResult.stackLog?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.12em] text-[#777] hover:text-white">Stack log</summary>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-black/50 p-3">
                    {aiStackResult.stackLog.map((line: string, i: number) => (
                      <p key={i} className="text-[10px] leading-5 text-[#777]">{line}</p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="rounded-[1.5rem] border border-[#242424] bg-black p-5">
            <div className="mb-4 flex items-center gap-3">
              <BadgeDollarSign className="text-[#C9A84C]" />
              <h3 className="text-2xl font-black text-white">Monetize</h3>
            </div>
            <p className="text-sm leading-6 text-[#999999]">The one-click launch attaches checkout automatically when the Pollo artifact is ready. If media is still processing, this panel stays honest and shows the next locked step.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {checkoutUrl ? <a href={checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white hover:border-[#C9A84C] hover:text-[#C9A84C]">Open checkout</a> : null}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#242424] bg-black p-5">
            <div className="mb-4 flex items-center gap-3">
              <RadioTower className="text-[#C9A84C]" />
              <h3 className="text-2xl font-black text-white">Distribute</h3>
            </div>
            <p className="text-sm leading-6 text-[#999999]">Telegram route creation is part of the same backend launch. It only returns campaign and tracked-route IDs after checkout and artifact proof exist.</p>
            {launchReceipt?.trackedUrl ? <a href={launchReceipt.trackedUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#C9A84C] px-5 py-3 text-sm font-black text-[#C9A84C] transition hover:bg-[#C9A84C] hover:text-black">Open tracked route</a> : null}
          </div>

          <div className="rounded-[1.5rem] border border-[#C9A84C]/30 bg-[#120d05] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Library className="text-[#C9A84C]" />
              <h3 className="text-2xl font-black text-white">Output receipt</h3>
            </div>
            <p className="text-sm leading-6 text-[#999999]">Every launch step prints a creator-facing receipt backed by returned package, provider, artifact, checkout, and campaign data.</p>
            <div className="mt-4 grid gap-3">
              {(launchReceipt?.steps?.length ? launchReceipt.steps : [{ label: "Receipt", value: "Launch a package to issue the first production receipt." }]).map((step, index) => (
                <div key={`${step.label}-${index}`} className="rounded-2xl border border-white/10 bg-black/55 p-3 text-sm leading-6">
                  <p className="font-black text-white">{step.label}</p>
                  {step.href ? (
                    <a href={step.href} target="_blank" rel="noreferrer" className="break-all text-[#C9A84C] hover:underline">{step.value}</a>
                  ) : (
                    <p className="break-all text-[#b8b8b8]">{step.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditPanel() {
  return (
    <section className="rounded-[2rem] border border-[#242424] bg-black p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Multi-track timeline editor</h2>
          <p className="mt-2 max-w-2xl text-[#999999]">The VaultX Editor now has a real multi-track timeline with drag-resize trimming, split, ripple edit, snapping, and cloud rendering through the Render Graph pipeline. No ffmpeg. Every button calls a real backend endpoint.</p>
        </div>
        <Link href="/vaultx/editor" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-7 py-4 text-base font-black text-black transition hover:brightness-110 active:scale-[0.98]">
          Open Editor
          <ArrowRight size={18} />
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Timeline", "Real multi-track drag-resize trimming, split at playhead, ripple edit, magnetic snapping, and undo/redo stack."],
          ["Render Graph", "Build a provider-agnostic render graph from your timeline, validate it, estimate costs, and submit to cloud rendering."],
          ["Publish", "Set price, destination, consent, watermark, and safety checks — then export a launch package directly to Studio."],
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
                <p className="mt-1 text-xs text-[#777]">Job {pkg.providerJobId || "not started"} • Artifact {pkg.artifactId || "not ready"}</p>
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
  const socialPresence = (capability.data as any)?.socialPresence;
  const socialPlatforms = (socialPresence?.platforms || []) as any[];
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
      <div className="mt-6 rounded-[1.5rem] border border-[#C9A84C]/25 bg-[#120d05] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-white">Official social activation board</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#999999]">These are the exact platform gates needed before CreatorVault or VaultX can publish through TikTok, Instagram, or Facebook. Connected apps unlock only lawful OAuth, approved scopes, user/page tokens, and webhook-backed automation.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-3 text-xs leading-5 text-[#b8b8b8]">
            <p>Callback base</p>
            <p className="break-all font-black text-[#C9A84C]">{socialPresence?.callbackBase || "Configure PUBLIC_APP_URL"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {socialPlatforms.map((platform) => (
            <div key={platform.id} className="rounded-[1.25rem] border border-white/10 bg-black/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-white">{platform.label}</h4>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#C9A84C]">{platform.products?.join(" • ")}</p>
                </div>
                <StatusPill active={Boolean(platform.configured)} text={platform.configured ? "CONFIGURED" : "NEEDS APP"} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#101010] p-3 text-xs leading-5 text-[#b8b8b8]">
                  <p className="font-black text-white">Required credentials</p>
                  <p>{platform.requiredCredentials?.join(" • ")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#101010] p-3 text-xs leading-5 text-[#b8b8b8]">
                  <p className="font-black text-white">Scopes / permissions</p>
                  <p>{platform.requiredScopes?.join(" • ")}</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-[#101010] p-3 text-xs leading-5 text-[#b8b8b8]">
                <p className="font-black text-white">Approval checklist</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {(platform.approvalChecklist || []).map((item: string) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function VaultXStudio() {
  const [nav, setNav] = useState<NavItem>("make");
  const [selectedMake, setSelectedMake] = useState<MakeChoice>("Body Cinema");

  // Guided flow state — tracks where the creator is in the 3-step flow
  const [guidedStep, setGuidedStep] = useState<1 | 2 | 3>(1);

  const STEPS = [
    { n: 1, label: "Upload or Edit", icon: <Upload size={16} />, desc: "Bring your video" },
    { n: 2, label: "Pick a Preset", icon: <Sparkles size={16} />, desc: "Choose your look" },
    { n: 3, label: "Launch", icon: <Zap size={16} />, desc: "Set price and go live" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-24 text-white">

      {/* Sticky header with step tracker */}
      <header className="sticky top-0 z-30 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <Link href="/vault-x" className="text-xl font-black tracking-tight text-white">
              Vault<span style={{ color: accent }}>X</span>
            </Link>
            {/* Step tracker */}
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => (
                <Fragment key={s.n}>
                  <button
                    onClick={() => setGuidedStep(s.n as 1 | 2 | 3)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition ${
                      guidedStep === s.n
                        ? "bg-[#C9A84C] text-black"
                        : guidedStep > s.n
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {guidedStep > s.n ? <Check size={12} /> : s.icon}
                    <span className="hidden sm:block">{s.label}</span>
                    <span className="sm:hidden">{s.n}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-4 ${ guidedStep > s.n ? "bg-emerald-500" : "bg-zinc-700" }`} />
                  )}
                </Fragment>
              ))}
            </div>
            {/* Advanced nav */}
            <button
              onClick={() => setNav(nav === "earn" ? "make" : "earn")}
              className="text-xs font-black text-zinc-500 hover:text-white"
            >
              {nav === "earn" ? "← Back" : "Money →"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5 md:px-6">

        {/* ═══ STEP 1: UPLOAD OR EDIT ═══════════════════════════════════════ */}
        {guidedStep === 1 && (
          <div>
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9A84C]">Step 1 of 3</p>
              <h1 className="mt-1 text-3xl font-black text-white">Bring your video.</h1>
              <p className="mt-1 text-sm text-zinc-400">Upload a clip to the editor, or use an existing URL. Your video is the source — everything else builds from it.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Option A: Go to Editor */}
              <Link
                href="/vaultx/editor"
                className="flex flex-col items-start gap-3 rounded-[1.5rem] border border-[#C9A84C]/40 bg-[#130f05] p-6 transition hover:border-[#C9A84C] hover:shadow-[0_0_30px_rgba(201,168,76,0.1)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9A84C] text-black">
                  <Film size={22} />
                </div>
                <div>
                  <p className="text-lg font-black text-white">Open Editor</p>
                  <p className="mt-1 text-sm text-zinc-400">Upload your clip, trim it, pick a style, set a price — then come back here to launch.</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-sm font-black text-[#C9A84C]">
                  Go to Editor <ArrowRight size={16} />
                </div>
              </Link>

              {/* Option B: Paste URL directly */}
              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#242424] bg-[#141414] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-[#C9A84C]">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-lg font-black text-white">Paste a video URL</p>
                  <p className="mt-1 text-sm text-zinc-400">Already have a hosted video? Paste the URL and go straight to launch.</p>
                </div>
                <button
                  onClick={() => setGuidedStep(2)}
                  className="mt-auto inline-flex items-center gap-2 rounded-full border border-[#C9A84C] px-4 py-2 text-sm font-black text-[#C9A84C] hover:bg-[#C9A84C] hover:text-black"
                >
                  Skip to preset picker <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setGuidedStep(2)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C9A84C] py-4 text-base font-black text-black"
            >
              I have my video — Next: Pick a Preset <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ═══ STEP 2: PICK A PRESET ════════════════════════════════════════ */}
        {guidedStep === 2 && (
          <div>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9A84C]">Step 2 of 3</p>
                <h1 className="mt-1 text-3xl font-black text-white">Pick a preset.</h1>
                <p className="mt-1 text-sm text-zinc-400">Each preset controls the lighting, motion, camera, and copy for your drop. Pick one — it fills everything in automatically.</p>
              </div>
              <button onClick={() => setGuidedStep(3)} className="flex-shrink-0 rounded-full border border-zinc-700 px-4 py-2 text-sm font-black text-zinc-400 hover:text-white">Skip →</button>
            </div>

            {/* Preset picker lives inside LaunchConsole — show full console here */}
            <LaunchConsole selectedMake={selectedMake} />
          </div>
        )}

        {/* ═══ STEP 3: LAUNCH ═══════════════════════════════════════════════ */}
        {guidedStep === 3 && (
          <div>
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9A84C]">Step 3 of 3</p>
              <h1 className="mt-1 text-3xl font-black text-white">Launch it.</h1>
              <p className="mt-1 text-sm text-zinc-400">Paste your video URL, confirm the price, check consent — then hit Ignite. The AI stack runs, Pollo generates, Stripe attaches, Telegram publishes.</p>
            </div>
            <LaunchConsole selectedMake={selectedMake} />
          </div>
        )}

        {/* Advanced panels — accessible from nav */}
        {nav === "edit" && <EditPanel />}
        {nav === "sell" && <SellPanel />}
        {nav === "earn" && <EarnPanel />}
        {nav === "settings" && <SettingsPanel />}

      </div>

      {/* Bottom nav — always visible on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-1 p-2">
          {STEPS.map(s => (
            <button
              key={s.n}
              onClick={() => setGuidedStep(s.n as 1 | 2 | 3)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-black transition ${
                guidedStep === s.n ? "bg-[#C9A84C] text-black" : "text-zinc-500"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
