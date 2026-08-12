import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { ArrowRight, Languages, Mic, ShieldCheck, Sparkles, Video } from "lucide-react";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { trpc } from "@/lib/trpc";

const languages = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "pt", name: "Portuguese" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
] as const;

function isVideo(asset: MediaAssetItem) {
  return asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"));
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
  const [targetLanguage, setTargetLanguage] = useState<(typeof languages)[number]["code"]>("es");
  const [spokenScript, setSpokenScript] = useState("");
  const mediaQuery = trpc.mediaAssets.list.useQuery({ filter: "videos", limit: 120 }, { staleTime: 30_000 });
  const adaptScript = (trpc as any).dubbingAI.generateDubbingScript.useMutation();
  const sources = useMemo(() => {
    const media = Array.isArray(mediaQuery.data) ? mediaQuery.data as MediaAssetItem[] : [];
    return media.filter((asset) => isVideo(asset) && Boolean(asset.publicUrl));
  }, [mediaQuery.data]);
  const activeSource = selectedAsset || sources.find((asset) => asset.id === handedOffSourceAssetId) || sources[0] || null;
  const selectedLanguage = languages.find((language) => language.code === targetLanguage) || languages[0];

  useEffect(() => {
    if (!handedOffSourceAssetId || selectedAsset || !sources.length) return;
    const handedOffAsset = sources.find((asset) => asset.id === handedOffSourceAssetId);
    if (handedOffAsset) setSelectedAsset(handedOffAsset);
  }, [handedOffSourceAssetId, selectedAsset, sources]);

  const prepareVoiceDirection = () => {
    if (!activeSource || !spokenScript.trim()) return;
    adaptScript.mutate({
      originalScript: spokenScript.trim(),
      sourceLanguage: "English",
      targetLanguage: selectedLanguage.name,
      preserveTiming: true,
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#060609] pb-20 pt-20 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_82%_10%,rgba(34,211,238,0.17),transparent_30%),radial-gradient(circle_at_12%_95%,rgba(168,85,247,0.15),transparent_34%),#090b10]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100"><Mic className="h-3.5 w-3.5" /> Voice Direction</div><h1 className="mt-5 text-5xl font-black leading-[0.84] tracking-[-0.075em] sm:text-7xl">Give the moment<br /><span className="text-cyan-200">the right words.</span></h1><p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">Start from a real saved video. Shape the spoken words for another language while holding onto the tone, timing, and intention of the original moment.</p></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-9 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)] lg:px-12">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1015] shadow-[0_25px_80px_-42px_rgba(34,211,238,0.5)]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Source video</p><h2 className="mt-1 max-w-[16rem] truncate text-xl font-black text-white sm:max-w-md">{activeSource ? activeSource.originalName || activeSource.fileName : "Choose footage from your vault"}</h2></div><button type="button" onClick={() => setPickerOpen(true)} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:bg-white hover:text-black">Choose source</button></div><div className="relative aspect-[16/10] bg-black sm:aspect-[16/9]">{activeSource?.publicUrl ? <video key={activeSource.id} src={activeSource.publicUrl} poster={videoPoster(activeSource)} controls playsInline preload="metadata" className="h-full w-full object-contain" /> : <div className="flex h-full flex-col items-center justify-center px-6 text-center"><Video className="h-10 w-10 text-zinc-600" /><p className="mt-4 text-lg font-black">Start with a saved video.</p><p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">CreatorVault will carry the exact footage you select through this direction step.</p></div>}{activeSource && <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">Verified video · {formatDuration(activeSource.duration)}</span>}</div><div className="flex gap-3 border-t border-white/10 p-5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><p className="text-sm leading-relaxed text-zinc-300">This room produces an adapted voice script from the words you provide. A spoken track is never presented as complete until there is a real track to play.</p></div></div>

        <div className="rounded-3xl border border-white/10 bg-[#101116] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100"><Languages className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Language direction</p><h2 className="mt-1 text-2xl font-black tracking-[-0.045em] text-white">Keep the feeling. Change the words.</h2></div></div><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{languages.map((language) => <button key={language.code} type="button" onClick={() => setTargetLanguage(language.code)} className={`rounded-xl border px-3 py-3 text-left text-xs font-black transition ${targetLanguage === language.code ? "border-cyan-200 bg-cyan-200 text-black" : "border-white/10 bg-white/[0.035] text-zinc-300 hover:border-white/30 hover:text-white"}`}>{language.name}</button>)}</div><div className="mt-6"><label className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">What is said in the source moment?</label><textarea value={spokenScript} onChange={(event) => setSpokenScript(event.target.value)} placeholder="Write the spoken words exactly as they should be understood…" rows={7} className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-600 focus:border-cyan-200/55 focus:outline-none" /></div><button type="button" disabled={!activeSource || !spokenScript.trim() || adaptScript.isPending} onClick={prepareVoiceDirection} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black text-black transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">{adaptScript.isPending ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />} Prepare {selectedLanguage.name} voice script</button>{adaptScript.error && <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-100">The script could not be prepared. Your source remains untouched.</p>}</div>
      </section>

      {adaptScript.data?.dubbedScript && <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"><div className="overflow-hidden rounded-3xl border border-cyan-200/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_48%),#0d1015] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Prepared voice script</p><h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{selectedLanguage.name} direction for this moment.</h2></div><Languages className="h-7 w-7 text-cyan-200" /></div><p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-zinc-100">{adaptScript.data.dubbedScript}</p></div></section>}

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} mode="single" title="Choose Your Video Source" subtitle="Only saved CreatorVault videos that can be opened and used are offered here." confirmLabel="Use This Video" onConfirm={(assets) => { const source = assets.find((asset) => isVideo(asset) && Boolean(asset.publicUrl)); if (!source) return; setSelectedAsset(source); setPickerOpen(false); }} />
    </main>
  );
}
