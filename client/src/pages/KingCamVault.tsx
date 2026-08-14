import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, AudioLines, Film, Play, ShieldCheck, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import type { MediaAssetItem } from "@/components/MediaPicker";

type VaultFilter = "all" | "video" | "image" | "audio";

function isVideo(asset: MediaAssetItem) {
  return asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"));
}

function isAudio(asset: MediaAssetItem) {
  return asset.assetType === "audio" || Boolean(asset.mimeType?.startsWith("audio/"));
}

function isReadySource(asset: MediaAssetItem) {
  const sourceUrl = String(asset.publicUrl || asset.storagePath || "");
  return String(asset.status || "ready").toLowerCase() === "ready"
    && Boolean(sourceUrl)
    && !/^https?:\/\/replicate\.delivery\//i.test(sourceUrl);
}

function isLegacyDelivery(asset: MediaAssetItem) {
  return /^https?:\/\/replicate\.delivery\//i.test(String(asset.publicUrl || asset.storagePath || ""));
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

function formatDate(value?: string | null) {
  if (!value) return "Recently added";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently added" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AudioCover({ compact = false }: { compact?: boolean }) {
  return <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_32%,rgba(103,232,249,0.26),transparent_26%),radial-gradient(circle_at_50%_105%,rgba(232,121,249,0.28),transparent_54%),#070914] ${compact ? "" : "min-h-[220px]"}`}>
    <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-end justify-center gap-1 px-5 pb-5 opacity-90">
      {Array.from({ length: compact ? 14 : 24 }).map((_, index) => <span key={index} className="w-1 rounded-full bg-gradient-to-t from-fuchsia-300 via-cyan-200 to-white" style={{ height: `${18 + ((index * 17) % 66)}%`, opacity: 0.42 + ((index % 4) * 0.14) }} />)}
    </div>
    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-100/45 bg-black/35 text-cyan-100 shadow-[0_0_42px_rgba(103,232,249,0.25)] backdrop-blur"><AudioLines className="h-7 w-7" /></div>
  </div>;
}

export function KingCamVault() {
  const { user, isLoading } = useAuth();
  const isKingCamOwner = user?.id === 6 || user?.id === 33 || user?.role === "king" || user?.role === "admin";
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const mediaQuery = trpc.mediaAssets.list.useQuery({ limit: 120 }, { staleTime: 30_000, enabled: Boolean(user && isKingCamOwner) });
  const allMedia = Array.isArray(mediaQuery.data) ? mediaQuery.data as MediaAssetItem[] : [];
  const media = allMedia.filter(isReadySource);
  const legacyDeliveryCount = allMedia.filter(isLegacyDelivery).length;
  const shownMedia = media.filter((asset) => {
    if (filter === "all") return true;
    if (filter === "video") return isVideo(asset);
    if (filter === "audio") return isAudio(asset);
    return !isVideo(asset) && !isAudio(asset);
  });
  const activeAsset = shownMedia.find((asset) => asset.id === activeAssetId) || media.find((asset) => asset.id === activeAssetId) || null;

  if (isLoading) return <div className="min-h-screen bg-[#050505]" aria-busy="true" />;

  if (!user || !isKingCamOwner) {
    return <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-6 text-center text-white"><ShieldCheck className="mb-4 h-12 w-12 text-zinc-600" /><h1 className="text-2xl font-black">KingCam access only</h1><p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">This private library holds KingCam’s creator-owned source media.</p><Link href="/king/content"><a className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Back to KingCam Content</a></Link></main>;
  }

  const videosReady = media.filter(isVideo).length;
  const soundtracksReady = media.filter(isAudio).length;

  return (
    <main className="min-h-screen bg-[#050505] pb-24 pt-20 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_78%_0%,rgba(217,70,239,0.17),transparent_34%),radial-gradient(circle_at_22%_100%,rgba(34,211,238,0.10),transparent_38%),#08080b]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 sm:py-14">
          <Link href="/king/content"><a className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> KingCam Content</a></Link>
          <div className="mt-8 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-2xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200"><ShieldCheck className="h-3.5 w-3.5" /> Private source library</div><h1 className="text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">Your footage.<br /><span className="text-fuchsia-200">Your soundtrack.</span></h1><p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-300">Every piece here is a verified CreatorVault source. Watch your footage, listen to your music, then move directly into a real creator workflow without uploading it again.</p></div>
            <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/35 text-center"><div className="min-w-24 border-r border-white/10 px-4 py-4"><p className="text-3xl font-black text-fuchsia-200">{videosReady}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Videos</p></div><div className="min-w-24 border-r border-white/10 px-4 py-4"><p className="text-3xl font-black text-cyan-200">{soundtracksReady}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Soundtracks</p></div><div className="min-w-24 px-4 py-4"><p className="text-3xl font-black text-white">{media.length}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Vault pieces</p></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex w-fit flex-wrap rounded-xl border border-white/10 bg-white/5 p-1">{([ ["all", "Everything"], ["video", "Videos"], ["audio", "Soundtracks"], ["image", "Images"] ] as Array<[VaultFilter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 text-xs font-black transition ${filter === value ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>{label}</button>)}</div><div className="text-right"><p className="text-sm text-zinc-400">Select any source to watch or listen full size.</p>{legacyDeliveryCount > 0 && <p className="mt-1 text-xs text-amber-200/75">{legacyDeliveryCount} historical delivery record{legacyDeliveryCount === 1 ? " is" : "s are"} held outside creation choices.</p>}</div></div>

        {mediaQuery.isLoading ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl border border-white/5 bg-white/[0.04]" />)}</div> : shownMedia.length === 0 ? <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center"><Film className="mx-auto h-10 w-10 text-zinc-600" /><h2 className="mt-4 text-xl font-black">No verified sources in this view yet.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">This library shows only media that CreatorVault can actually open and use. Switch the view or add a source through your normal creation flow.</p></div> : <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{shownMedia.map((asset) => {
          const video = isVideo(asset);
          const audio = isAudio(asset);
          const active = activeAsset?.id === asset.id;
          const kind = video ? "Video source" : audio ? "Governed soundtrack" : "Image source";
          return <button key={asset.id} type="button" onClick={() => setActiveAssetId(asset.id)} className={`group relative overflow-hidden rounded-2xl border bg-[#0a0a0f] text-left transition duration-200 ${active ? "border-fuchsia-300/70 shadow-[0_0_0_1px_rgba(232,121,249,0.3),0_18px_35px_-20px_rgba(232,121,249,0.7)]" : "border-white/10 hover:-translate-y-0.5 hover:border-white/30"}`}><div className="relative aspect-[3/4] overflow-hidden bg-black">{video && asset.publicUrl ? <video key={`${asset.id}-${active ? "active" : "idle"}`} src={asset.publicUrl} poster={videoPoster(asset)} muted loop autoPlay={active} playsInline preload="metadata" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : audio ? <AudioCover /> : asset.thumbnailUrl || asset.publicUrl ? <img src={asset.thumbnailUrl || asset.publicUrl || ""} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(232,121,249,0.14),transparent_55%)]"><Video className="h-8 w-8 text-zinc-600" /></div>}{!audio && <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/25 to-transparent" />}{video && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur"><Play className="h-3 w-3 fill-white" /> {formatDuration(asset.duration)}</span>}{audio && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-cyan-100/30 bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 backdrop-blur"><AudioLines className="h-3 w-3" /> {formatDuration(asset.duration)}</span>}{active && <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-fuchsia-200/70 bg-fuchsia-300 text-black"><Sparkles className="h-3.5 w-3.5" /></span>}</div><div className="p-3"><p className="truncate text-sm font-black text-white">{asset.originalName || asset.fileName}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.10em] text-zinc-500">{kind} · {formatDate(asset.createdAt)}</p></div></button>;
        })}</div>}
      </section>

      {activeAsset && (() => {
        const video = isVideo(activeAsset);
        const audio = isAudio(activeAsset);
        return <section className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08080c]/95 px-4 py-4 backdrop-blur-2xl sm:px-6"><div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-4"><div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">{video && activeAsset.publicUrl ? <video src={activeAsset.publicUrl} poster={videoPoster(activeAsset)} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : audio ? <AudioCover compact /> : activeAsset.thumbnailUrl || activeAsset.publicUrl ? <img src={activeAsset.thumbnailUrl || activeAsset.publicUrl || ""} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{activeAsset.originalName || activeAsset.fileName}</p><p className="mt-1 text-xs text-zinc-400">{video ? `${formatDuration(activeAsset.duration)} video source` : audio ? `${formatDuration(activeAsset.duration)} governed soundtrack` : "Image source"} · Saved {formatDate(activeAsset.createdAt)}</p>{audio && activeAsset.publicUrl && <audio className="mt-3 h-9 w-full max-w-xl" controls preload="metadata" src={activeAsset.publicUrl} />}</div></div>{video ? <div className="grid grid-cols-2 gap-2 sm:flex"><Link href={`/vault-x/studio?sourceAssetId=${activeAsset.id}`}><a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-fuchsia-200 px-4 text-xs font-black text-black transition hover:bg-white"><Film className="h-4 w-4" /> Body Cinema</a></Link><Link href={`/vaultx/trailers?sourceAssetId=${activeAsset.id}`}><a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-black text-white transition hover:bg-white/10"><Video className="h-4 w-4" /> Trailer Maker</a></Link></div> : audio ? <Link href={`/vault-x/studio?audioAssetId=${activeAsset.id}`}><a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-200 px-4 text-xs font-black text-black transition hover:bg-white"><AudioLines className="h-4 w-4" /> Use in Body Cinema</a></Link> : null}</div></section>;
      })()}
    </main>
  );
}

export default KingCamVault;
