import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Film, Image as ImageIcon, LoaderCircle, Play, Sparkles, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { HOMEPAGE_MEDIA, hasCertifiedPublicProof } from "@/lib/homepageMediaRegistry";

type MarketingFormat = "editorial_flyer" | "motion_flyer" | "motion_mixtape_cover";
type ArtDirection = "black_label" | "kings_release" | "after_hours" | "creator_spotlight";

const formats: Array<{ id: MarketingFormat; label: string; eyebrow: string; description: string; requiresVideo: boolean; badge: string }> = [
  { id: "editorial_flyer", label: "Editorial Flyer", eyebrow: "Still campaign art", description: "A real saved poster built from your own image or video source.", requiresVideo: false, badge: "PNG" },
  { id: "motion_flyer", label: "Motion Flyer", eyebrow: "The proven weapon", description: "A six-second 9:16 campaign piece driven by your own footage.", requiresVideo: true, badge: "MP4 + PNG" },
  { id: "motion_mixtape_cover", label: "Motion Mixtape Cover", eyebrow: "Square cover + loop", description: "A 1:1 cover image with a matching moving release loop.", requiresVideo: false, badge: "1:1 PNG + MP4" },
];

const directions: Array<{ id: ArtDirection; label: string; note: string; accent: string }> = [
  { id: "black_label", label: "Black Label Editorial", note: "Dark luxury. White headline. Gold restraint.", accent: "#c9a84c" },
  { id: "kings_release", label: "King’s Release", note: "Authority, premium energy, crown-level detail.", accent: "#e7c66a" },
  { id: "after_hours", label: "After Hours", note: "Music, nightlife, deep shadows, release energy.", accent: "#9a7754" },
  { id: "creator_spotlight", label: "Creator Spotlight", note: "Your creator image is the hero—not a template.", accent: "#00d9ff" },
];

function isVideo(asset: MediaAssetItem) {
  return asset.assetType === "video" || String(asset.mimeType || "").startsWith("video/");
}

function sourcePreview(asset: MediaAssetItem | null) {
  if (!asset) return null;
  const url = asset.publicUrl || asset.storagePath || "";
  if (!url) return null;
  return isVideo(asset)
    ? <video src={url} poster={asset.thumbnailUrl || undefined} muted autoPlay loop playsInline className="h-full w-full object-cover" />
    : <img src={url} alt={asset.fileName} className="h-full w-full object-cover" />;
}

function formatDate(value: unknown) {
  if (!value) return "Just now";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Saved" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MotionFlyerAgent() {
  const [format, setFormat] = useState<MarketingFormat>("motion_flyer");
  const [artDirection, setArtDirection] = useState<ArtDirection>("black_label");
  const [headline, setHeadline] = useState("");
  const [supportingLine, setSupportingLine] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [source, setSource] = useState<MediaAssetItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishedProject, setFinishedProject] = useState<any>(null);

  const flyersQuery = trpc.flyerStudio.getFlyers.useQuery();
  const marketingProjectsQuery = trpc.flyerStudio.getMarketingMakerProjects.useQuery();
  const createProject = trpc.flyerStudio.createMarketingMakerProject.useMutation({
    onSuccess: (project) => {
      setFinishedProject(project);
      marketingProjectsQuery.refetch();
    },
  });
  const createProof = trpc.flyerStudio.createCertifiedProof.useMutation({
    onSuccess: () => flyersQuery.refetch(),
  });

  const selectedFormat = formats.find((item) => item.id === format) ?? formats[1];
  const selectedDirection = directions.find((item) => item.id === artDirection) ?? directions[0];
  const newestMarketingProject = marketingProjectsQuery.data?.projects.find((project: any) => project.status === "ready" && project.stillUrl);
  const newestLegacyFlyer = flyersQuery.data?.flyers.find((flyer: any) => flyer.status === "ready" && flyer.artifactUrl);
  const certifiedSample = HOMEPAGE_MEDIA.motionFlyerProof;
  const sampleIsApproved = hasCertifiedPublicProof(certifiedSample);
  const result = finishedProject || newestMarketingProject || null;
  const resultStill = result?.stillUrl || null;
  const resultMotion = result?.motionUrl || newestLegacyFlyer?.artifactUrl || (sampleIsApproved ? certifiedSample.livePath : null);
  const resultIsOwnerOutput = Boolean(result?.stillUrl || newestLegacyFlyer?.artifactUrl);

  const sourceEligibility = useMemo(() => {
    return (asset: MediaAssetItem) => !selectedFormat.requiresVideo || isVideo(asset);
  }, [selectedFormat.requiresVideo]);

  const chooseSource = (assets: MediaAssetItem[]) => {
    const selected = assets[0] ?? null;
    setSource(selected);
    setPickerOpen(false);
  };

  const build = () => {
    const sourceUrl = String(source?.publicUrl || source?.storagePath || "");
    if (!sourceUrl || !headline.trim()) return;
    createProject.mutate({
      format,
      artDirection,
      headline: headline.trim(),
      supportingLine: supportingLine.trim(),
      callToAction: callToAction.trim(),
      sourceMediaUrl: sourceUrl,
      sourceMediaType: isVideo(source as MediaAssetItem) ? "video" : "image",
    });
  };

  const buildBlocked = !source || !headline.trim() || createProject.isPending;

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_7%,rgba(201,168,76,.18),transparent_28%),radial-gradient(circle_at_8%_42%,rgba(0,217,255,.09),transparent_31%),linear-gradient(135deg,#080706,#161008_58%,#080706)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
          <header className="flex items-center justify-between border-b border-white/15 pb-5">
            <div className="flex items-center gap-3"><Wand2 className="h-5 w-5 text-[#efd18c]" /><span className="text-xs font-black uppercase tracking-[.2em] text-[#f3d899]">ByDevineDesign Marketing Maker</span></div>
            <Link href="/king/content"><a className="text-xs font-black uppercase tracking-[.15em] text-zinc-300 transition hover:text-white">Creation room</a></Link>
          </header>

          <div className="grid gap-10 py-10 lg:grid-cols-[.88fr_1.12fr] lg:items-start lg:py-14">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#efd18c]">Your design DNA, not a template</p>
              <h1 className="mt-5 max-w-xl text-5xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">Make the release<br />feel <span className="text-[#f3d899]">expensive.</span></h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">Dark editorial source media. One commanding headline. A restrained call to action. Your finished flyer lives in CreatorVault only after a real asset has been rendered and saved.</p>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                {formats.map((item) => {
                  const active = item.id === format;
                  return <button key={item.id} type="button" onClick={() => { setFormat(item.id); if (item.requiresVideo && source && !isVideo(source)) setSource(null); }} className={`min-h-36 border p-4 text-left transition ${active ? "border-[#efd18c] bg-[#efd18c]/10" : "border-white/10 bg-black/20 hover:border-white/30"}`}>
                    <span className={`text-[9px] font-black uppercase tracking-[.16em] ${active ? "text-[#f3d899]" : "text-zinc-500"}`}>{item.eyebrow}</span>
                    <span className="mt-3 block text-lg font-black leading-tight">{item.label}</span>
                    <span className="mt-3 block text-[10px] font-bold uppercase tracking-[.12em] text-zinc-500">{item.badge}</span>
                  </button>;
                })}
              </div>

              <div className="mt-7 border border-white/10 bg-black/25 p-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#efd18c]">01 / Pick the real source</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[.7fr_1.3fr]">
                  <button type="button" onClick={() => setPickerOpen(true)} className="relative min-h-44 overflow-hidden border border-dashed border-white/25 bg-[#0b0b0b] text-left transition hover:border-[#efd18c]">
                    {sourcePreview(source)}
                    {!source ? <div className="absolute inset-0 flex flex-col justify-end p-4"><ImageIcon className="mb-auto h-7 w-7 text-[#efd18c]" /><span className="text-sm font-black">Choose from your Media Vault</span></div> : null}
                    {source ? <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3"><span className="text-[10px] font-black uppercase tracking-[.14em] text-white">Change source</span></div> : null}
                  </button>
                  <div className="flex flex-col justify-center">
                    <p className="text-xl font-black">{source ? source.fileName : selectedFormat.requiresVideo ? "Choose a real creator video." : "Choose a real creator image or video."}</p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">{selectedFormat.requiresVideo ? "Motion Flyer moves from your own video. We will not turn a random template into your campaign." : "The source stays yours. CreatorVault applies the art direction without replacing the creator moment."}</p>
                    {source ? <span className="mt-4 inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#7ee2aa]"><Check className="h-3.5 w-3.5" /> Verified ready source selected</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-white/15 bg-[#0d0d12]/90 p-5 shadow-2xl shadow-black/30 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#efd18c]">02 / Direct the campaign</p><p className="mt-2 text-xl font-black">{selectedFormat.label}</p></div>
                <span className="border border-[#efd18c]/40 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-[#efd18c]">{selectedFormat.badge}</span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {directions.map((item) => <button key={item.id} type="button" onClick={() => setArtDirection(item.id)} className={`border p-4 text-left transition ${item.id === artDirection ? "border-white/40 bg-white/[.07]" : "border-white/10 bg-black/20 hover:border-white/25"}`}>
                  <span className="block h-1.5 w-10" style={{ backgroundColor: item.accent }} />
                  <span className="mt-4 block text-sm font-black">{item.label}</span>
                  <span className="mt-2 block text-xs leading-relaxed text-zinc-500">{item.note}</span>
                </button>)}
              </div>

              <div className="mt-6 space-y-4">
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">The dominant line</span><input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={90} placeholder="MAKE THEM FEEL IT" className="mt-2 min-h-14 w-full border border-white/15 bg-black/30 px-4 text-lg font-black uppercase tracking-[-.03em] text-white outline-none transition placeholder:text-zinc-700 focus:border-[#efd18c]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Supporting line <span className="text-zinc-600">optional</span></span><textarea value={supportingLine} onChange={(event) => setSupportingLine(event.target.value)} maxLength={240} rows={2} placeholder="Give the moment just enough context." className="mt-2 w-full resize-none border border-white/15 bg-black/30 p-4 text-sm leading-relaxed text-white outline-none transition placeholder:text-zinc-700 focus:border-[#efd18c]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Action line <span className="text-zinc-600">optional</span></span><input value={callToAction} onChange={(event) => setCallToAction(event.target.value)} maxLength={80} placeholder="ENTER THE VAULT" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-4 text-sm font-black uppercase tracking-[.12em] text-white outline-none transition placeholder:text-zinc-700 focus:border-[#efd18c]" /></label>
              </div>

              <button type="button" onClick={build} disabled={buildBlocked} className="mt-7 inline-flex min-h-15 w-full items-center justify-center gap-2 bg-[#f3d899] px-6 font-black text-[#19130c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
                {createProject.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {createProject.isPending ? "Rendering your real asset" : `Build ${selectedFormat.label}`}
              </button>
              {createProject.error ? <p className="mt-4 text-sm font-semibold text-red-300">The asset was not claimed as finished. {createProject.error.message}</p> : null}
              <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[.12em] text-zinc-500">Your source stays CreatorVault-owned · finished only after a real saved output exists</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_.88fr]">
          <div className="overflow-hidden border border-white/15 bg-black">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#efd18c]">03 / Finished proof</p><p className="mt-1 text-lg font-black">{result?.headline || newestLegacyFlyer?.headline || "Your Marketing Maker output"}</p></div>{resultIsOwnerOutput ? <span className="text-[9px] font-black uppercase tracking-[.14em] text-[#7ee2aa]">Saved owner output</span> : <span className="text-[9px] font-black uppercase tracking-[.14em] text-zinc-500">Accepted example only</span>}</div>
            <div className="grid min-h-[26rem] bg-[#080706] sm:grid-cols-2">
              <div className="relative min-h-64 bg-black">{resultStill ? <img src={resultStill} alt="Saved Marketing Maker still" className="h-full w-full object-cover" /> : <div className="absolute inset-0 flex flex-col justify-end p-6"><ImageIcon className="mb-auto h-8 w-8 text-zinc-700" /><p className="text-2xl font-black">The still shows up only after the real export exists.</p></div>}</div>
              <div className="relative min-h-64 bg-black">{resultMotion ? <video src={String(resultMotion)} poster={result?.thumbnailUrl || newestLegacyFlyer?.thumbnailUrl || undefined} controls autoPlay loop muted playsInline className="h-full w-full object-cover" aria-label={resultIsOwnerOutput ? "Completed CreatorVault marketing motion" : "Accepted CreatorVault motion flyer example"} /> : <div className="absolute inset-0 flex flex-col justify-end p-6"><Film className="mb-auto h-8 w-8 text-zinc-700" /><p className="text-2xl font-black">Motion opens only after a real MP4 is saved.</p></div>}</div>
            </div>
            {(resultStill || resultMotion) ? <div className="flex flex-wrap gap-3 border-t border-white/10 p-4">{resultStill ? <a href={resultStill} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 text-xs font-black uppercase tracking-[.12em] transition hover:border-[#efd18c]">Open still <ArrowUpRight className="h-3.5 w-3.5" /></a> : null}{resultMotion ? <a href={String(resultMotion)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[#efd18c]/50 px-4 text-xs font-black uppercase tracking-[.12em] text-[#efd18c] transition hover:bg-[#efd18c]/10">Play motion <Play className="h-3.5 w-3.5 fill-current" /></a> : null}</div> : null}
          </div>

          <aside className="border border-white/10 bg-white/[.025] p-6">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#efd18c]">Design DNA is protected</p>
            <h2 className="mt-4 text-3xl font-black leading-none tracking-[-.05em]">No template pile. No fake finish.</h2>
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">The maker starts with real source media, keeps the image clear of crowded text, gives one message the power, and saves the result back to your vault. That is how it stays yours.</p>
            <div className="mt-7 space-y-3 border-t border-white/10 pt-5 text-[10px] font-black uppercase tracking-[.13em] text-zinc-400"><p>Dark luxury, not generic AI</p><p>One dominant visual, one message, one action</p><p>Slow deliberate motion, never random effects</p><p>Saved asset before any completed claim</p></div>
            <div className="mt-8 border-t border-white/10 pt-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Existing proof lane preserved</p><button type="button" onClick={() => createProof.mutate()} disabled={createProof.isPending} className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#efd18c] transition hover:text-white disabled:opacity-50">{createProof.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}{createProof.isPending ? "Rebuilding accepted proof" : "Rebuild the accepted Motion Flyer proof"}</button></div>
          </aside>
        </div>

        <div className="mt-8 grid border-t border-white/10 pt-5 text-xs font-black uppercase tracking-[.15em] text-zinc-400 sm:grid-cols-3"><span>Creator-owned source</span><span className="sm:text-center">ByDevineDesign art direction</span><span className="sm:text-right">CreatorVault proof + storage</span></div>
      </section>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={chooseSource}
        mode="single"
        title={selectedFormat.requiresVideo ? "Choose your motion source" : "Choose your campaign source"}
        subtitle={selectedFormat.requiresVideo ? "Motion Flyer needs a real ready CreatorVault video." : "Choose a real CreatorVault image or video. The design grows from your media."}
        confirmLabel="Use this source"
        emptyActionHref="/media/hub"
        emptyActionLabel="Open Media Hub"
        assetEligibility={sourceEligibility}
      />
    </main>
  );
}

export default MotionFlyerAgent;
