import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { AudioLines, ShieldCheck, Video } from "lucide-react";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { trpc } from "@/lib/trpc";

function isVideo(asset: MediaAssetItem) {
  return asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"));
}

function isLockedKingCamHero(asset: MediaAssetItem) {
  const reference = [asset.publicUrl, asset.fileName, asset.originalName].filter(Boolean).join(" ").toLowerCase();
  return reference.includes("/videos/kingcam-hero-cam.mp4") || reference.includes("kingcam-continuous-hero-loop");
}

function isEligibleDubbingSource(asset: MediaAssetItem) {
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

export default function DubbingAI() {
  const search = useSearch();
  const handedOffSourceAssetId = new URLSearchParams(search).get("sourceAssetId");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetItem | null>(null);
  const mediaQuery = trpc.mediaAssets.list.useQuery({ filter: "videos", limit: 120 }, { staleTime: 30_000 });
  const sources = useMemo(() => {
    const media = Array.isArray(mediaQuery.data) ? mediaQuery.data as MediaAssetItem[] : [];
    return media.filter(isEligibleDubbingSource);
  }, [mediaQuery.data]);
  const activeSource = selectedAsset || sources.find((asset) => asset.id === handedOffSourceAssetId) || sources[0] || null;

  useEffect(() => {
    if (!handedOffSourceAssetId || selectedAsset || !sources.length) return;
    const handedOffAsset = sources.find((asset) => asset.id === handedOffSourceAssetId);
    if (handedOffAsset) setSelectedAsset(handedOffAsset);
  }, [handedOffSourceAssetId, selectedAsset, sources]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#060609] pb-20 pt-20 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_82%_10%,rgba(34,211,238,0.17),transparent_30%),radial-gradient(circle_at_12%_95%,rgba(168,85,247,0.15),transparent_34%),#090b10]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100"><AudioLines className="h-3.5 w-3.5" /> Voice & Dubbing</div><h1 className="mt-5 text-5xl font-black leading-[0.84] tracking-[-0.075em] sm:text-7xl">Your source stays<br /><span className="text-cyan-200">in your control.</span></h1><p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">Start from a real saved video. This room will not call anything finished until it can give you a voice track you can actually play with your footage.</p></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-9 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)] lg:px-12">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1015] shadow-[0_25px_80px_-42px_rgba(34,211,238,0.5)]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Source video</p><h2 className="mt-1 max-w-[16rem] truncate text-xl font-black text-white sm:max-w-md">{activeSource ? activeSource.originalName || activeSource.fileName : "Choose footage from your vault"}</h2></div><button type="button" onClick={() => setPickerOpen(true)} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:bg-white hover:text-black">Choose source</button></div><div className="relative aspect-[16/10] bg-black sm:aspect-[16/9]">{activeSource?.publicUrl ? <video key={activeSource.id} src={activeSource.publicUrl} poster={videoPoster(activeSource)} autoPlay loop muted controls playsInline preload="metadata" className="h-full w-full object-contain" /> : <div className="flex h-full flex-col items-center justify-center px-6 text-center"><Video className="h-10 w-10 text-zinc-600" /><p className="mt-4 text-lg font-black">Start with a saved video.</p><p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">CreatorVault will keep the exact footage you choose attached to this room.</p></div>}{activeSource && <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">Verified video · {formatDuration(activeSource.duration)}</span>}</div></div>

        <aside className="rounded-3xl border border-cyan-200/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_48%),#101116] p-6 sm:p-8"><div className="flex items-start gap-3"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">What is real today</p><h2 className="mt-1 text-2xl font-black tracking-[-0.045em] text-white">A finished dub is not ready yet.</h2></div></div><p className="mt-6 text-sm leading-relaxed text-zinc-300">The old words-only path could make a translated paragraph, but it could not listen to your selected video, hold its timing, or give you a track to play. This room stays closed to creation instead of pretending that is dubbing.</p><div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">What this needs before it opens</p><p className="mt-3 text-sm leading-relaxed text-zinc-200">One owned video → real spoken words → a voice track matched to its timing → review → a playable result in your Media Vault.</p></div><p className="mt-6 text-xs leading-relaxed text-zinc-500">Your selected footage is safe here. Nothing is being made from it on this screen.</p></aside>
      </section>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} mode="single" title="Choose Your Video Source" subtitle="Only saved CreatorVault videos that can be opened and used are offered here." confirmLabel="Use This Video" assetEligibility={isEligibleDubbingSource} onConfirm={(assets) => { const source = assets.find(isEligibleDubbingSource); if (!source) return; setSelectedAsset(source); setPickerOpen(false); }} />
    </main>
  );
}
