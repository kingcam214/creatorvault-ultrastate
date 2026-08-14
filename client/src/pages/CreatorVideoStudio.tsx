import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Film, Play, ShieldCheck, Sparkles, Video } from "lucide-react";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { trpc } from "@/lib/trpc";

function isVideo(asset: MediaAssetItem) {
  return asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"));
}

function isLockedKingCamHero(asset: MediaAssetItem) {
  const reference = [asset.publicUrl, asset.fileName, asset.originalName].filter(Boolean).join(" ").toLowerCase();
  return reference.includes("/videos/kingcam-hero-cam.mp4") || reference.includes("kingcam-continuous-hero-loop");
}

function isEligibleCreatorVideo(asset: MediaAssetItem) {
  return isVideo(asset) && Boolean(asset.publicUrl) && !isLockedKingCamHero(asset);
}

function videoPoster(asset: MediaAssetItem) {
  const candidate = asset.thumbnailUrl ?? "";
  return /\.(avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(candidate) ? candidate : undefined;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function CreatorVideoStudio() {
  const [, setLocation] = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetItem | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const mediaQuery = trpc.mediaAssets.list.useQuery({ filter: "videos", limit: 120 }, { staleTime: 30_000 });
  const verifiedVideoSources = useMemo(() => {
    const media = Array.isArray(mediaQuery.data) ? mediaQuery.data as MediaAssetItem[] : [];
    return media.filter(isEligibleCreatorVideo);
  }, [mediaQuery.data]);
  const activeSource = selectedAsset || verifiedVideoSources[0] || null;

  const continueWith = (destination: "body-cinema" | "trailer-maker") => {
    if (!activeSource?.publicUrl) {
      setSelectionMessage("Choose a saved video first. CreatorVault only opens footage it can actually use.");
      setPickerOpen(true);
      return;
    }
    const path = destination === "body-cinema" ? "/vault-x/studio" : "/trailer-maker";
    setLocation(`${path}?sourceAssetId=${encodeURIComponent(activeSource.id)}`);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#060608] pb-20 pt-20 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.20),transparent_30%),radial-gradient(circle_at_15%_95%,rgba(251,191,36,0.10),transparent_36%),#09090d]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100"><Sparkles className="h-3.5 w-3.5" /> Creator Video Studio</div>
            <h1 className="mt-5 text-5xl font-black leading-[0.84] tracking-[-0.075em] text-white sm:text-7xl">Start with the<br /><span className="text-violet-200">moment you own.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">Choose a saved CreatorVault source, watch it, and send that exact footage into the creation room built for it. Nothing is invented, replaced, or presented as finished before there is a real result to watch.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d12] shadow-[0_25px_80px_-42px_rgba(168,85,247,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Your selected source</p><h2 className="mt-1 text-xl font-black text-white">{activeSource ? activeSource.originalName || activeSource.fileName : "Choose footage from your vault"}</h2></div><button type="button" onClick={() => { setSelectionMessage(null); setPickerOpen(true); }} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:bg-white hover:text-black">Choose saved footage</button></div>
            <div className="relative aspect-[16/10] bg-black sm:aspect-[16/9]">
              {activeSource?.publicUrl ? <video key={activeSource.id} src={activeSource.publicUrl} poster={videoPoster(activeSource)} controls autoPlay loop muted playsInline preload="metadata" className="h-full w-full object-contain" /> : <div className="flex h-full flex-col items-center justify-center px-6 text-center"><Video className="h-10 w-10 text-zinc-600" /><p className="mt-4 text-lg font-black text-white">Your real footage belongs here.</p><p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">This studio only starts from videos CreatorVault can open and carry into the next creation step.</p></div>}
              {activeSource && <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">Verified video · {formatDuration(activeSource.duration)}</span>}
            </div>
            <div className="border-t border-white/10 p-5 sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><p className="text-sm leading-relaxed text-zinc-300">The source remains connected through the next step. CreatorVault does not use visual tricks to stand in for a watchable premium creation.</p></div>{selectionMessage && <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm font-bold text-amber-100">{selectionMessage}</p>}</div>
          </div>

          <div className="flex flex-col gap-4">
            <button type="button" onClick={() => continueWith("body-cinema")} className="group overflow-hidden rounded-3xl border border-fuchsia-300/25 bg-[radial-gradient(circle_at_top_right,rgba(232,121,249,0.16),transparent_42%),#101015] p-6 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-200/60">
              <div className="flex items-start justify-between gap-5"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-300/15 text-fuchsia-200"><Film className="h-6 w-6" /></span><ArrowRight className="h-5 w-5 text-fuchsia-200 transition group-hover:translate-x-1" /></div><p className="mt-8 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">Body Cinema</p><h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Read the moment.<br />Choose the treatment.</h2><p className="mt-4 text-sm leading-relaxed text-zinc-300">Your selected footage moves into source intelligence, measured moments, and the treatment decision made around what is actually in the clip.</p><span className="mt-6 inline-flex text-xs font-black text-fuchsia-100">Open with this source <ArrowRight className="ml-2 h-4 w-4" /></span></button>
            <button type="button" onClick={() => continueWith("trailer-maker")} className="group overflow-hidden rounded-3xl border border-amber-200/25 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),transparent_42%),#101015] p-6 text-left transition hover:-translate-y-0.5 hover:border-amber-100/60">
              <div className="flex items-start justify-between gap-5"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200/15 text-amber-100"><Play className="h-6 w-6 fill-current" /></span><ArrowRight className="h-5 w-5 text-amber-100 transition group-hover:translate-x-1" /></div><p className="mt-8 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">Trailer Maker</p><h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Build the story<br />around the source.</h2><p className="mt-4 text-sm leading-relaxed text-zinc-300">Carry the exact selected video into your trailer direction: opening, structure, aspect, purpose, and release intent all stay tied to the real footage.</p><span className="mt-6 inline-flex text-xs font-black text-amber-50">Open with this source <ArrowRight className="ml-2 h-4 w-4" /></span></button>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Available creator sources</p><p className="mt-1 text-sm text-zinc-300">{mediaQuery.isLoading ? "Reading your vault…" : `${verifiedVideoSources.length} verified video${verifiedVideoSources.length === 1 ? " is" : "s are"} ready to choose.`}</p></div><Link href="/king/media-vault"><a className="inline-flex items-center gap-2 text-sm font-black text-violet-200 transition hover:text-white">Open Media Vault <ArrowRight className="h-4 w-4" /></a></Link></div>
      </section>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="single"
        title="Choose Your Video Source"
        subtitle="Only saved CreatorVault videos that can be opened and used are offered here."
        confirmLabel="Use This Video"
        assetEligibility={isEligibleCreatorVideo}
        onConfirm={(assets) => {
          const source = assets.find(isEligibleCreatorVideo);
          if (!source) { setSelectionMessage("Choose a ready video source from your vault."); return; }
          setSelectedAsset(source);
          setSelectionMessage(null);
          setPickerOpen(false);
        }}
      />
    </main>
  );
}
