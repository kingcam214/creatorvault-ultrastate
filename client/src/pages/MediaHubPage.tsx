import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  Clapperboard,
  Clock3,
  Film,
  Image as ImageIcon,
  LockKeyhole,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type MediaFilter = "all" | "video" | "image";

type VaultAsset = {
  id: string;
  assetType?: string | null;
  sourceType?: string | null;
  classification?: string | null;
  bodyCinemaEligible?: boolean;
  fileName?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  publicUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt?: string | Date | null;
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return "Ready now";
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
};

const formatSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "CreatorVault media";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
};

const formatCreated = (value?: string | Date | null) => {
  if (!value) return "Owned by you";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Owned by you";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const isVideo = (asset: VaultAsset) => asset.assetType === "video" || asset.mimeType?.startsWith("video/");

function classificationLabel(asset: VaultAsset) {
  if (asset.classification === "kingcam_performance_driver") return "KingCam clone-only source";
  if (asset.classification === "private_presence_loop") return "KingCam private presence";
  if (asset.classification === "finished_showcase") return "Finished showcase";
  if (asset.classification === "approved_demo") return "Approved demo";
  if (asset.bodyCinemaEligible) return "Body Cinema ready";
  return "Creator-owned media";
}

function classificationTone(asset: VaultAsset) {
  if (asset.classification === "kingcam_performance_driver" || asset.classification === "private_presence_loop") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }
  if (asset.bodyCinemaEligible || asset.classification === "approved_demo") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }
  return "border-white/10 bg-white/[0.055] text-zinc-200";
}

function AssetPreview({ asset, compact = false }: { asset: VaultAsset; compact?: boolean }) {
  const source = asset.publicUrl || asset.thumbnailUrl;
  const video = isVideo(asset);

  if (!source) {
    return (
      <div className={`flex items-center justify-center bg-[radial-gradient(circle_at_30%_10%,rgba(166,104,255,0.32),transparent_40%),#17131e] ${compact ? "h-full" : "aspect-video"}`}>
        {video ? <Film className="h-8 w-8 text-white/40" /> : <ImageIcon className="h-8 w-8 text-white/40" />}
      </div>
    );
  }

  if (video) {
    return (
      <div className={`relative overflow-hidden bg-[#120f18] ${compact ? "h-full" : "aspect-video"}`}>
        <video className="h-full w-full object-cover" src={source} muted playsInline preload="metadata" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white backdrop-blur">
          <Play className="h-3 w-3 fill-current" /> Video
        </span>
      </div>
    );
  }

  return <img className={`w-full object-cover ${compact ? "h-full" : "aspect-video"}`} src={source} alt={asset.fileName || "CreatorVault media"} loading="lazy" />;
}

export default function MediaHubPage() {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mediaQuery = trpc.mediaAssets.list.useQuery({ filter: "all", limit: 120 }, { staleTime: 30_000, retry: false });
  const assets = (mediaQuery.data ?? []) as VaultAsset[];

  const counts = useMemo(() => ({
    all: assets.length,
    video: assets.filter(isVideo).length,
    image: assets.filter((asset) => !isVideo(asset)).length,
  }), [assets]);

  const visibleAssets = useMemo(() => assets.filter((asset) => {
    if (filter === "all") return true;
    return filter === "video" ? isVideo(asset) : !isVideo(asset);
  }), [assets, filter]);

  const selectedAsset = visibleAssets.find((asset) => asset.id === selectedId) ?? visibleAssets[0] ?? null;
  const selectedIsVideo = selectedAsset ? isVideo(selectedAsset) : false;

  const filters: Array<{ id: MediaFilter; label: string; count: number }> = [
    { id: "all", label: "Everything", count: counts.all },
    { id: "video", label: "Video", count: counts.video },
    { id: "image", label: "Images", count: counts.image },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#09070d] text-[#f8f3e9]">
      <section className="relative isolate overflow-hidden border-b border-white/10 px-5 pb-11 pt-8 sm:px-8 lg:px-12 lg:pb-16 lg:pt-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_5%,rgba(197,154,255,0.23),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(255,189,95,0.15),transparent_26%),linear-gradient(135deg,#120a20_0%,#09070d_48%,#101015_100%)]" />
        <div className="pointer-events-none absolute right-[-12rem] top-[-15rem] -z-10 h-[34rem] w-[34rem] rounded-full border border-violet-200/10" />
        <div className="pointer-events-none absolute right-[-6rem] top-[-9rem] -z-10 h-[22rem] w-[22rem] rounded-full border border-amber-100/10" />

        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-violet-200/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-100">
                <ShieldCheck className="h-3.5 w-3.5" /> Your owned media, in one place
              </div>
              <h1 className="mt-5 text-5xl font-black tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">THE MEDIA<br /><span className="text-[#e9c78f]">VAULT.</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">This is not a demo shelf. These are the files that are actually ready in your CreatorVault. Pick the right source, see what it is cleared for, and move it into a real CreatorVault room.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] border border-white/10 bg-black/25 p-2 backdrop-blur sm:min-w-[325px]">
              {filters.map((entry) => (
                <button key={entry.id} onClick={() => setFilter(entry.id)} className={`rounded-[1.05rem] px-3 py-4 text-left transition duration-200 ${filter === entry.id ? "bg-[#f3e8d0] text-[#171017] shadow-[0_12px_40px_rgba(243,232,208,0.16)]" : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"}`}>
                  <span className="block text-2xl font-black tracking-[-0.06em]">{entry.count}</span>
                  <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] opacity-75">{entry.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:px-12 lg:py-12">
        <div>
          {mediaQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((index) => <div key={index} className="h-64 animate-pulse rounded-[1.6rem] border border-white/5 bg-white/[0.035]" />)}
            </div>
          ) : mediaQuery.isError ? (
            <div className="rounded-[1.6rem] border border-rose-200/20 bg-rose-200/[0.06] p-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100">Your media stayed protected</p>
              <h2 className="mt-2 text-2xl font-black text-white">The vault could not load right now.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">Nothing was changed or lost. Refresh the room to reconnect to your CreatorVault media library.</p>
              <button onClick={() => mediaQuery.refetch()} className="mt-5 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-xs font-black uppercase tracking-[0.13em] text-white transition hover:bg-white/15">Try again</button>
            </div>
          ) : visibleAssets.length === 0 ? (
            <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-violet-200/25 bg-[radial-gradient(circle_at_85%_10%,rgba(161,111,255,0.22),transparent_34%),#110d17] p-8 sm:p-12">
              <UploadCloud className="h-10 w-10 text-[#e9c78f]" />
              <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-violet-200">Your vault is ready</p>
              <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.055em] text-white">Bring in the source that deserves to become something bigger.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">Once a video or image is safely in CreatorVault, it will show up here with its real status. No fake preview cards. No made-up results.</p>
              <Link href="/creator/video-studio" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f3e8d0] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#171017] transition hover:bg-white">
                <Plus className="h-4 w-4" /> Add a real source <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleAssets.map((asset) => {
                const active = selectedAsset?.id === asset.id;
                return (
                  <button key={asset.id} onClick={() => setSelectedId(asset.id)} className={`group overflow-hidden rounded-[1.4rem] border text-left transition duration-200 ${active ? "border-[#e9c78f]/70 bg-[#18121b] shadow-[0_18px_55px_rgba(201,155,255,0.14)]" : "border-white/10 bg-[#121015] hover:-translate-y-1 hover:border-violet-200/35 hover:bg-[#18121b]"}`}>
                    <div className="h-44"><AssetPreview asset={asset} compact /></div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-black leading-5 text-white">{asset.fileName || asset.originalName || "Untitled CreatorVault media"}</p>
                        {isVideo(asset) ? <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#e9c78f]" /> : <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500"><span>{formatDuration(asset.duration)}</span><span>{formatSize(asset.fileSize)}</span></div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#141117] shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            {selectedAsset ? (
              <>
                <div className="relative aspect-video bg-black">
                  {selectedIsVideo && selectedAsset.publicUrl ? <video className="h-full w-full object-contain" src={selectedAsset.publicUrl} controls playsInline preload="metadata" /> : <AssetPreview asset={selectedAsset} />}
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${classificationTone(selectedAsset)}`}>
                      {selectedAsset.classification === "kingcam_performance_driver" || selectedAsset.classification === "private_presence_loop" ? <LockKeyhole className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                      {classificationLabel(selectedAsset)}
                    </span>
                  </div>
                  <h2 className="mt-4 break-words text-xl font-black leading-6 tracking-[-0.04em] text-white">{selectedAsset.fileName || selectedAsset.originalName || "CreatorVault media"}</h2>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-black/25 p-3"><span className="block text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">Shape</span><span className="mt-1 block font-bold text-zinc-100">{selectedAsset.width && selectedAsset.height ? `${selectedAsset.width} × ${selectedAsset.height}` : "Original file"}</span></div>
                    <div className="rounded-xl bg-black/25 p-3"><span className="block text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">Added</span><span className="mt-1 block font-bold text-zinc-100">{formatCreated(selectedAsset.createdAt)}</span></div>
                    <div className="rounded-xl bg-black/25 p-3"><span className="block text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">Length</span><span className="mt-1 block font-bold text-zinc-100">{formatDuration(selectedAsset.duration)}</span></div>
                    <div className="rounded-xl bg-black/25 p-3"><span className="block text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">Source</span><span className="mt-1 block truncate font-bold text-zinc-100">{selectedAsset.sourceType || "CreatorVault"}</span></div>
                  </div>
                  {(selectedAsset.classification === "kingcam_performance_driver" || selectedAsset.classification === "private_presence_loop") && <p className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.06] p-4 text-xs leading-5 text-amber-50/85">This KingCam material stays inside the KingCam system. It does not automatically enter Body Cinema or become a public proof.</p>}
                </div>
              </>
            ) : (
              <div className="p-7"><Sparkles className="h-7 w-7 text-[#e9c78f]" /><h2 className="mt-5 text-xl font-black text-white">Your next source starts here.</h2><p className="mt-3 text-sm leading-6 text-zinc-300">This panel will show the real details for anything stored in your vault.</p></div>
            )}
          </div>

          <div className="mt-5 rounded-[1.6rem] border border-violet-200/15 bg-[linear-gradient(135deg,rgba(129,74,201,0.18),rgba(18,15,24,0.92))] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">Move with intention</p>
            <h3 className="mt-2 text-lg font-black tracking-[-0.035em] text-white">Open a real CreatorVault room.</h3>
            <div className="mt-4 grid gap-2">
              <Link href="/creator/video-studio" className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-white transition hover:border-white/25 hover:bg-white/10"><span className="inline-flex items-center gap-2"><Clapperboard className="h-4 w-4 text-[#e9c78f]" /> Video Studio</span><ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-white" /></Link>
              <Link href="/creator/caption-stage" className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-white transition hover:border-white/25 hover:bg-white/10"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-200" /> Caption Stage</span><ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-white" /></Link>
              <Link href="/trailer-maker" className="group flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-white transition hover:border-white/25 hover:bg-white/10"><span className="inline-flex items-center gap-2"><Film className="h-4 w-4 text-emerald-200" /> Trailer Maker</span><ArrowUpRight className="h-4 w-4 text-zinc-400 transition group-hover:text-white" /></Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
