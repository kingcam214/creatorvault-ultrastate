import { useMemo } from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, Crown, Film, Play, ShieldCheck, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import type { MediaAssetItem } from "@/components/MediaPicker";

function isVideo(asset: MediaAssetItem) {
  return asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"));
}

function isPlayableCloneUrl(url?: string | null) {
  return Boolean(url) && !/^https:\/\/replicate\.delivery\//i.test(String(url));
}

function videoPoster(asset: MediaAssetItem) {
  const candidate = asset.thumbnailUrl ?? "";
  return /\.(avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(candidate) ? candidate : undefined;
}

function formatDate(value?: string | null) {
  if (!value) return "Saved in CreatorVault";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved in CreatorVault" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function CloneEmpire() {
  const { user, isLoading } = useAuth();
  const search = useSearch();
  const sourceAssetId = new URLSearchParams(search).get("sourceAssetId");
  const mediaQuery = trpc.mediaAssets.list.useQuery({ limit: 120 }, { staleTime: 30_000, enabled: Boolean(user) });
  const cloneContentQuery = trpc.cloneEmpire.listCloneContent.useQuery({ limit: 50, offset: 0, contentType: "video" }, { retry: false, enabled: Boolean(user) });
  const media = Array.isArray(mediaQuery.data) ? mediaQuery.data as MediaAssetItem[] : [];
  const selectedIdentitySource = media.find((asset) => asset.id === sourceAssetId) || null;
  const cloneMedia = useMemo(() => {
    const legacy = Array.isArray(cloneContentQuery.data?.items) ? cloneContentQuery.data.items : [];
    const vault = media.filter((asset) => isVideo(asset) && isPlayableCloneUrl(asset.publicUrl) && /kingcam|clone/i.test(`${asset.originalName || ""} ${asset.fileName || ""}`));
    const legacyItems = legacy.filter((item: any) => isPlayableCloneUrl(item.video_url)).map((item: any) => ({ id: `clone:${item.id}`, title: item.title || item.context || "KingCam clone motion", url: item.video_url as string, poster: item.thumbnail_url as string | null, createdAt: item.created_at as string | null }));
    const vaultItems = vault.map((asset) => ({ id: asset.id, title: asset.originalName || asset.fileName, url: asset.publicUrl!, poster: videoPoster(asset), createdAt: asset.createdAt || null }));
    return [...vaultItems, ...legacyItems].filter((item, index, all) => all.findIndex((candidate) => candidate.url === item.url) === index).slice(0, 9);
  }, [cloneContentQuery.data?.items, media]);

  if (isLoading) return <div className="min-h-screen bg-[#050506]" aria-busy="true" />;
  if (!user) return <main className="flex min-h-screen items-center justify-center bg-[#050506] p-6 text-center text-white"><div><ShieldCheck className="mx-auto h-12 w-12 text-zinc-600" /><h1 className="mt-4 text-2xl font-black">KingCam access only</h1><p className="mt-2 text-sm text-zinc-400">Your clone media stays inside your private CreatorVault space.</p><Link href="/king/content"><a className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Back to KingCam Content</a></Link></div></main>;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050506] pb-20 pt-20 text-white">
      <section className="relative min-h-[620px] overflow-hidden border-b border-white/10 bg-[#09090d]">
        <div className="absolute inset-0"><video src="/videos/kingcam-hero-cam.mp4" poster="/assets/kingcam-hero.jpg" autoPlay loop muted playsInline preload="auto" className="h-full w-full object-contain object-right opacity-100" /><div className="absolute inset-0 bg-gradient-to-r from-[#050506] via-[#050506]/45 to-transparent" /></div>
        <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl items-end px-5 pb-14 sm:px-8 lg:px-12"><div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100"><Crown className="h-3.5 w-3.5" /> KingCam Clone Command</div><h1 className="mt-5 text-5xl font-black leading-[0.84] tracking-[-0.075em] sm:text-7xl">The identity<br /><span className="text-amber-100">you can watch.</span></h1><p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">Your live clone library begins with real moving media. Watch the work. Keep the identity source visible. Nothing is called a new clone performance until there is a finished performance to play.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/king/media-vault"><a className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-amber-100">Open identity media <ArrowRight className="h-4 w-4" /></a></Link><Link href="/king/content"><a className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">Back to Creator Command</a></Link></div></div></div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        {selectedIdentitySource && <div className="mb-9 overflow-hidden rounded-3xl border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_48%),#0e0e12] p-5 sm:p-6"><div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-center"><div className="aspect-video overflow-hidden rounded-2xl bg-black">{isVideo(selectedIdentitySource) && selectedIdentitySource.publicUrl ? <video src={selectedIdentitySource.publicUrl} poster={videoPoster(selectedIdentitySource)} muted controls playsInline preload="metadata" className="h-full w-full object-cover" /> : selectedIdentitySource.thumbnailUrl || selectedIdentitySource.publicUrl ? <img src={selectedIdentitySource.thumbnailUrl || selectedIdentitySource.publicUrl || ""} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Video className="h-7 w-7 text-zinc-600" /></div>}</div><div><p className="text-[10px] font-black uppercase tracking-[0.17em] text-amber-100">Chosen identity source</p><h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-white">{selectedIdentitySource.originalName || selectedIdentitySource.fileName}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-300">This is the exact saved source carried into Clone Command. It remains visible as the identity reference; it is not replaced by a random stand-in.</p></div></div></div>}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.17em] text-zinc-500">Existing clone library</p><h2 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white">Watch the real KingCam motion.</h2></div><p className="max-w-sm text-sm leading-relaxed text-zinc-400">Only watchable clone media is shown here. Direction records and incomplete jobs are kept out of the library.</p></div>
        {cloneContentQuery.isLoading || mediaQuery.isLoading ? <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[9/14] animate-pulse rounded-3xl bg-white/[0.05]" />)}</div> : cloneMedia.length ? <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">{cloneMedia.map((item) => <article key={item.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d12] transition hover:-translate-y-0.5 hover:border-amber-100/40"><div className="relative aspect-[9/14] bg-black"><video src={item.url} poster={item.poster || undefined} controls muted playsInline preload="metadata" className="h-full w-full object-cover" /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" /><span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur"><Play className="h-3 w-3 fill-current" /> Watchable</span></div><div className="p-4"><p className="truncate text-sm font-black text-white">{item.title}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">{formatDate(item.createdAt)}</p></div></article>)}</div> : <div className="mt-7 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 sm:p-10"><Film className="h-9 w-9 text-zinc-600" /><h2 className="mt-5 text-2xl font-black text-white">No finished clone performance is available to watch yet.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">CreatorVault will keep this library empty rather than fill it with a plan, a job record, or a visual substitute. Your approved moving KingCam identity remains available above.</p></div>}
      </section>
    </main>
  );
}
