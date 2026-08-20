import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Film, Loader2, Play, Sparkles, Type, Video } from "lucide-react";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { trpc } from "@/lib/trpc";
import { CAPTION_ENGINE_FAMILIES, CAPTION_ENGINE_TEMPLATES, CAPTION_ENGINE_FEELS, captionEngineFamilyLabel, getCaptionEngineTemplate, type CaptionEngineFeel, type CaptionPlacement, type CaptionSafeZone } from "@shared/captionEngine";

type CaptionStyle = string;
type CaptionSegment = { start: number; end: number; text: string };
type CaptionTypography = { size: number; color: string | null; highlightColor: string | null; background: string | null };
type CaptionProject = {
  id: string;
  sourceAssetId: string;
  sourceVideoUrl: string;
  sourceTitle: string;
  sourceDurationSeconds: number;
  transcript: string;
  segments: CaptionSegment[];
  captionStyle: CaptionStyle;
  captionPlacement: CaptionPlacement;
  safeZone: CaptionSafeZone;
  status: string;
  artifactUrl: string | null;
  thumbnailUrl: string | null;
  renderError: string | null;
  captionReviewStatus: string;
  captionReviewedAt: string | null;
  captionTypography: CaptionTypography;
};

type Treatment = { id: string; title: string; eyebrow: string; detail: string; family: string; energy: number };

const placementChoices: Array<{ id: CaptionPlacement; label: string; detail: string }> = [
  { id: "adaptive", label: "Let Caption Engine place it", detail: "Uses the style and frame shape to stay clear of platform buttons." },
  { id: "top", label: "Above the body", detail: "Keep the moment open below." },
  { id: "center", label: "Center pull", detail: "Let the words lead the eye." },
  { id: "lower", label: "Low but safe", detail: "Natural viewing without the app buttons." },
];

const safeZoneChoices: Array<{ id: CaptionSafeZone; label: string; detail: string }> = [
  { id: "platform_safe", label: "Platform safe", detail: "Built around real short-form app controls." },
  { id: "vertical", label: "Vertical drop", detail: "Built for Reels, Stories, and TikTok." },
  { id: "square", label: "Square post", detail: "Built for the grid." },
  { id: "landscape", label: "Wide screen", detail: "Built for a bigger frame." },
];

function isEligibleCreatorVideo(asset: MediaAssetItem) {
  const sourceUrl = String(asset.publicUrl || "").trim();
  const reference = [sourceUrl, asset.fileName, asset.originalName, asset.sourceType].filter(Boolean).join(" ").toLowerCase();
  const isCreatorVaultHosted = /^(?:https:\/\/creatorvault\.live\/(?:uploads|videos)\/|\/(?:uploads|videos)\/)/i.test(sourceUrl);
  const isVideo = asset.assetType === "video" || Boolean(asset.mimeType?.startsWith("video/"));
  const isOriginalCreatorUpload = String(asset.sourceType || "").toLowerCase() === "upload";
  const isRejectedOrBenchmarkOutput = /(?:rejected|benchmark|vace|topaz)/.test(reference);
  return isVideo && isCreatorVaultHosted && isOriginalCreatorUpload && !isRejectedOrBenchmarkOutput && Number(asset.duration || 0) > 0 && Number(asset.width || 0) > 0 && Number(asset.height || 0) > 0;
}

function overlayPosition(placement: CaptionPlacement, safeZone: CaptionSafeZone) {
  const safe = safeZone === "vertical" ? "18%" : safeZone === "square" ? "10%" : safeZone === "landscape" ? "8%" : "17%";
  if (placement === "top") return { top: safe };
  if (placement === "center") return { top: "50%", transform: "translateY(-50%)" };
  return { bottom: safe };
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function CaptionStage() {
  const [, setLocation] = useLocation();
  const sourceAssetIdFromUrl = useMemo(() => new URLSearchParams(window.location.search).get("sourceAssetId"), []);
  const mediaQuery = trpc.mediaAssets.list.useQuery({ filter: "videos", limit: 120 }, { staleTime: 30_000 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetItem | null>(null);
  const [project, setProject] = useState<CaptionProject | null>(null);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("founder");
  const [captionPlacement, setCaptionPlacement] = useState<CaptionPlacement>("adaptive");
  const [safeZone, setSafeZone] = useState<CaptionSafeZone>("platform_safe");
  const [captionTypography, setCaptionTypography] = useState<CaptionTypography>({ size: 1, color: null, highlightColor: null, background: null });
  const [selectedFeel, setSelectedFeel] = useState<CaptionEngineFeel>("authority");
  const [treatments, setTreatments] = useState<Treatment[]>(() => CAPTION_ENGINE_TEMPLATES.filter((template) => template.bestFor.includes("authority")).slice(0, 3));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [reviewTexts, setReviewTexts] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const stageVideoRef = useRef<HTMLVideoElement>(null);

  const sources = useMemo(() => {
    const rows = Array.isArray(mediaQuery.data) ? mediaQuery.data as MediaAssetItem[] : [];
    return rows.filter(isEligibleCreatorVideo);
  }, [mediaQuery.data]);

  useEffect(() => {
    if (selectedAsset || !sources.length) return;
    const requested = sourceAssetIdFromUrl ? sources.find((asset) => asset.id === sourceAssetIdFromUrl) : null;
    setSelectedAsset(requested || sources[0] || null);
  }, [selectedAsset, sourceAssetIdFromUrl, sources]);

  const activeSource = selectedAsset;
  const timedSegments = project?.segments || [];
  const activeSegment = timedSegments.find((segment) => currentTime >= segment.start && currentTime <= segment.end) || null;
  const activeTemplate = getCaptionEngineTemplate(captionStyle);
  const previewWords = String(activeSegment?.text || "").trim().split(/\s+/).filter(Boolean);
  const previewActiveWord = previewWords.length ? Math.min(previewWords.length - 1, Math.floor((currentTime - Number(activeSegment?.start || 0)) / Math.max(.12, Number(activeSegment?.end || 0) - Number(activeSegment?.start || 0)) * previewWords.length)) : 0;
  const createTimedCaptions = trpc.captionStage.createTimedCaptions.useMutation({
    onSuccess: (result) => {
      setProject(result as CaptionProject);
      setCaptionStyle((result as CaptionProject).captionStyle);
      setCaptionPlacement((result as CaptionProject).captionPlacement);
      setSafeZone((result as CaptionProject).safeZone);
      setCaptionTypography((result as CaptionProject).captionTypography || { size: 1, color: null, highlightColor: null, background: null });
      setNotice("Your spoken words are now timed against this exact saved video. Pick the feeling and Caption Engine will give you three real directions.");
    },
    onError: (error) => setNotice(error.message),
  });
  useEffect(() => {
    setReviewTexts(project?.segments.map(segment => segment.text) || []);
  }, [project?.id]);
  const reviewTimedWords = trpc.captionStage.reviewTimedWords.useMutation({
    onSuccess: (result) => { setProject(result as CaptionProject); setNotice("Your real words are locked to this exact moving source."); },
    onError: (error) => setNotice(error.message),
  });
  const updatePresentation = trpc.captionStage.updatePresentation.useMutation({
    onSuccess: (result) => setProject(result as CaptionProject),
    onError: (error) => setNotice(error.message),
  });
  const recommendTreatments = trpc.captionStage.recommendTreatments.useMutation({
    onSuccess: (result) => {
      const next = (result as { treatments: Treatment[] }).treatments || [];
      setTreatments(next);
      if (next[0]) setCaptionStyle(next[0].id);
      setNotice((result as { source: string }).source === "ai" ? "Caption Engine read the words and picked three directions for this moment." : "Caption Engine picked three directions from the real words and the feeling you chose.");
    },
    onError: (error) => setNotice(error.message),
  });
  const renderMaster = trpc.captionStage.renderCaptionedMaster.useMutation({
    onSuccess: (result) => {
      setProject(result as CaptionProject);
      setNotice("Your captioned master is ready to watch.");
    },
    onError: (error) => setNotice(error.message),
  });

  const readMyWords = async () => {
    if (!activeSource) { setPickerOpen(true); setNotice("Choose a saved video first. Caption Stage only works from footage already inside your CreatorVault."); return; }
    setNotice(null);
    await createTimedCaptions.mutateAsync({ sourceAssetId: activeSource.id, captionStyle, captionPlacement, safeZone });
  };

  const lockTimedWords = async () => {
    if (!project || reviewTexts.length !== project.segments.length) return;
    setNotice(null);
    await reviewTimedWords.mutateAsync({ projectId: project.id, texts: reviewTexts });
  };

  const chooseFeeling = async (feel: CaptionEngineFeel) => {
    setSelectedFeel(feel);
    if (!project?.transcript) {
      const quick = CAPTION_ENGINE_TEMPLATES.filter((template) => template.bestFor.includes(feel)).slice(0, 3) as Treatment[];
      setTreatments(quick);
      if (quick[0]) setCaptionStyle(quick[0].id);
      return;
    }
    await recommendTreatments.mutateAsync({ feeling: feel, transcript: project.transcript });
  };

  const prepareCaptionedMaster = async () => {
    if (!project || project.captionReviewStatus !== "creator_approved") return;
    setNotice(null);
    const updated = await updatePresentation.mutateAsync({ projectId: project.id, captionStyle, captionPlacement, safeZone, captionTypography });
    setProject(updated as CaptionProject);
    await renderMaster.mutateAsync({ projectId: project.id });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#050506] pb-24 pt-20 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_82%_18%,rgba(232,210,255,.16),transparent_28%),radial-gradient(circle_at_10%_96%,rgba(227,177,91,.12),transparent_32%),#09090d]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <Link href="/creator/video-studio"><a className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-zinc-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Creator Video Studio</a></Link>
          <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div><p className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/25 bg-fuchsia-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-100"><Type className="h-3.5 w-3.5" /> Caption Stage</p><h1 className="mt-5 max-w-3xl text-5xl font-black leading-[.82] tracking-[-.075em] text-white sm:text-7xl">Put the words<br />inside the <span className="text-[#e8d2ff]">moment.</span></h1><p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">Start with your saved video. Caption Stage reads the words that are actually spoken, locks them to the real timing, and lets you see the look on moving media before you prepare a captioned master.</p></div>
            <div className="border-l border-white/10 pl-5 text-sm leading-relaxed text-zinc-400"><p className="font-black text-white">No made-up dialogue.</p><p className="mt-2">If your clip has no clear spoken words, CreatorVault says that plainly. It does not fake captions just to make a screen look finished.</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1.18fr)_390px]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0b10] shadow-[0_32px_100px_-48px_rgba(216,180,255,.6)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Moving caption preview</p><p className="mt-1 text-lg font-black text-white">{activeSource ? activeSource.originalName || activeSource.fileName : "Choose your saved video"}</p></div><button type="button" onClick={() => setPickerOpen(true)} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:border-white hover:bg-white hover:text-black">Choose saved video</button></div>
            <div className={`relative mx-auto min-h-[540px] overflow-hidden bg-black ${(safeZone === "vertical" || safeZone === "platform_safe") ? "max-w-[430px]" : safeZone === "square" ? "max-w-[620px]" : "max-w-none"}`} style={{ aspectRatio: (safeZone === "vertical" || safeZone === "platform_safe") ? "9 / 16" : safeZone === "square" ? "1 / 1" : "16 / 9" }}>
              {activeSource?.publicUrl ? <video ref={stageVideoRef} key={activeSource.id} src={activeSource.publicUrl} controls autoPlay loop muted playsInline preload="metadata" onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"><Video className="h-12 w-12 text-zinc-600" /><p className="mt-5 text-2xl font-black text-white">Your moving source belongs here.</p><p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">Choose a saved CreatorVault video. Caption Stage will never ask you to paste a link or upload the same footage again.</p><button type="button" onClick={() => setPickerOpen(true)} className="mt-6 rounded-full bg-[#e8d2ff] px-5 py-3 text-sm font-black text-black">Open my saved videos</button></div>}
              {activeSegment && <div className="pointer-events-none absolute left-[9%] right-[9%] z-10 flex justify-center" style={overlayPosition(captionPlacement === "adaptive" ? (activeTemplate.placement === "adaptive" ? "lower" : activeTemplate.placement) : captionPlacement, safeZone)}><div style={{ maxWidth: "82%", borderRadius: "0.9rem", border: activeTemplate.stroke, padding: "0.65rem 0.9rem", textAlign: "center", fontFamily: activeTemplate.font, fontWeight: activeTemplate.weight, fontSize: `calc(clamp(1.2rem, 4.2vw, 2.65rem) * ${captionTypography.size})`, lineHeight: .9, letterSpacing: "-.04em", background: captionTypography.background || activeTemplate.background, color: captionTypography.color || activeTemplate.color, boxShadow: activeTemplate.shadow, textTransform: activeTemplate.family === "premium_cinematic" || activeTemplate.family === "creator_talking_head" ? "none" : "uppercase" }}>{previewWords.map((word, index) => <span key={`${word}-${index}`} style={{ display: "inline-block", marginRight: "0.24em", color: (activeTemplate.activeWordBehavior === "karaoke" && index === previewActiveWord) || (activeTemplate.emphasisRule === "final_word" && index === previewWords.length - 1) || (activeTemplate.emphasisRule === "keywords" && word.replace(/[^a-z0-9]/gi, "").length >= 7) ? (captionTypography.highlightColor || activeTemplate.highlightColor) : (captionTypography.color || activeTemplate.color), transform: activeTemplate.activeWordBehavior === "keyword_blast" && index === previewActiveWord ? "scale(1.12)" : "scale(1)" }}>{word}</span>)}</div></div>}
              {activeSource && <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white backdrop-blur">{safeZone === "platform_safe" ? "Platform-safe frame" : safeZone === "vertical" ? "Vertical safe frame" : safeZone === "square" ? "Square safe frame" : "Wide safe frame"}</div>}
              {project?.status === "captioned_master_ready" && project.artifactUrl && <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-emerald-200/30 bg-black/75 p-4 backdrop-blur-xl"><p className="text-sm font-black text-emerald-100">Captioned master ready</p><a href={project.artifactUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs font-black text-white underline underline-offset-4">Watch the finished file <ArrowRight className="h-3.5 w-3.5" /></a></div>}
            </div>
            <div className="border-t border-white/10 px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-zinc-300">{activeSegment ? <><span className="font-black text-white">Live now:</span> {formatTime(activeSegment.start)}–{formatTime(activeSegment.end)}</> : timedSegments.length ? "Play the video to watch the words move with the sound." : "Read the real words first. Then the preview comes alive."}</p>{timedSegments.length > 0 && <span className="text-xs font-black text-[#e8d2ff]">{timedSegments.length} timed moments</span>}</div></div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[.035] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">01 · Read the real words</p><p className="mt-3 text-2xl font-black tracking-[-.045em] text-white">Let the source speak first.</p><p className="mt-3 text-sm leading-relaxed text-zinc-400">Caption Stage only pulls words from the exact saved video you chose. Nothing gets typed in for show.</p><button type="button" onClick={readMyWords} disabled={!activeSource || createTimedCaptions.isPending} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e8d2ff] px-5 py-3.5 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">{createTimedCaptions.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading your words</> : <><Sparkles className="h-4 w-4" /> Read my spoken words</>}</button></div>
            <div className="rounded-[1.75rem] border border-[#e8d2ff]/20 bg-[radial-gradient(circle_at_80%_10%,rgba(232,210,255,.16),transparent_35%),rgba(255,255,255,.035)] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e8d2ff]">02 · What should this feel like?</p><p className="mt-3 text-2xl font-black tracking-[-.045em] text-white">Pick the feeling. Not a template.</p><div className="mt-4 grid grid-cols-2 gap-2">{CAPTION_ENGINE_FEELS.map((feel) => <button key={feel} type="button" onClick={() => void chooseFeeling(feel)} disabled={recommendTreatments.isPending} className={`rounded-xl border px-3 py-2 text-left text-xs font-black capitalize transition ${selectedFeel === feel ? "border-[#e8d2ff] bg-[#e8d2ff] text-black" : "border-white/10 bg-black/25 text-zinc-300 hover:border-white/45 hover:text-white"}`}>{feel}</button>)}</div><p className="mt-4 text-xs leading-relaxed text-zinc-400">Caption Engine reads the real words, looks at your feeling, and gives you three directions that fit the moment.</p></div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0b10] p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">Your three directions</p><p className="mt-1 text-sm font-bold text-white">Built from the feeling you chose.</p></div><button type="button" onClick={() => setLibraryOpen((value) => !value)} className="text-xs font-black text-[#e8d2ff] underline underline-offset-4">{libraryOpen ? "Close library" : "All 42 styles"}</button></div><div className="mt-4 grid gap-2">{treatments.map((choice) => <button key={choice.id} type="button" onClick={() => setCaptionStyle(choice.id)} className={`group flex items-center justify-between rounded-2xl border p-4 text-left transition ${captionStyle === choice.id ? "border-[#e8d2ff] bg-[#e8d2ff]/10" : "border-white/10 bg-black/20 hover:border-white/35"}`}><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">{choice.eyebrow}</p><p className="mt-1 text-lg font-black text-white">{choice.title}</p><p className="mt-1 text-xs text-zinc-400">{choice.detail}</p></div>{captionStyle === choice.id ? <Check className="h-5 w-5 text-[#e8d2ff]" /> : <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1" />}</button>)}</div></div>
          </aside>
        </div>

        {libraryOpen && <section className="mt-7 rounded-[2rem] border border-white/10 bg-[#0b0b10] p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f3d68b]">Caption Engine library</p><h2 className="mt-2 text-3xl font-black tracking-[-.055em] text-white">42 real behaviors. No recycled cards.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">Every style is a behavior system: its own timing, motion, emphasis, size, safe placement, and visual language.</p></div><p className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-zinc-300">{CAPTION_ENGINE_TEMPLATES.length} styles · 12 signature languages</p></div><div className="mt-7 space-y-8">{CAPTION_ENGINE_FAMILIES.map((family) => <div key={family}><div className="mb-3 flex items-center gap-3"><p className="text-lg font-black text-white">{captionEngineFamilyLabel(family)}</p><div className="h-px flex-1 bg-white/10" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{CAPTION_ENGINE_TEMPLATES.filter((template) => template.family === family).map((template) => <button key={template.id} type="button" onClick={() => { setCaptionStyle(template.id); setLibraryOpen(false); }} className={`rounded-2xl border p-4 text-left transition ${captionStyle === template.id ? "border-[#e8d2ff] bg-[#e8d2ff]/10" : "border-white/10 bg-black/25 hover:border-white/35"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">{template.eyebrow}</p><p className="mt-1 text-lg font-black text-white">{template.title}</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-black text-zinc-400">Energy {template.energy}/5</span></div><p className="mt-2 text-xs leading-relaxed text-zinc-400">{template.detail}</p><p className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-[#e8d2ff]">{template.timing} timing · {template.activeWordBehavior.replace(/_/g, " ")}</p></button>)}</div></div>)}</div></section>}

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1fr_1.25fr]">
          <section className="rounded-[1.75rem] border border-[#e8d2ff]/20 bg-[linear-gradient(140deg,rgba(232,210,255,.09),rgba(11,11,16,.98)_45%)] p-5 lg:col-span-2"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e8d2ff]">03 · Check every word</p><h2 className="mt-3 text-2xl font-black tracking-[-.05em] text-white">The words have to be right.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">Caption Stage never passes an unreviewed transcript off as finished. Read what it heard against your moving source, fix any word that missed, then lock the real words to this exact timing.</p>{project?.segments.length ? <div className="mt-5 space-y-2">{project.segments.map((segment, index) => <label key={`${segment.start}-${index}`} className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2"><span className="text-[10px] font-black tabular-nums text-[#e8d2ff]">{formatTime(segment.start)}–{formatTime(segment.end)}</span><input aria-label={`Timed caption ${index + 1}`} value={reviewTexts[index] || ""} onChange={(event) => setReviewTexts(current => current.map((text, itemIndex) => itemIndex === index ? event.target.value : text))} className="w-full border-0 bg-transparent text-sm font-black text-white outline-none placeholder:text-zinc-600" /></label>)}</div> : <p className="mt-5 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-400">Read the saved source first. Its timed words will show here for a real check.</p>}{project?.captionReviewStatus === "creator_approved" ? <p className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-200"><Check className="h-4 w-4" /> Real words locked in.</p> : <button type="button" onClick={lockTimedWords} disabled={!project?.segments.length || reviewTimedWords.isPending} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e8d2ff] px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{reviewTimedWords.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Locking the real words</> : <><Check className="h-4 w-4" /> These words are right — lock them in</>}</button>}</section>

          <section className="rounded-[1.75rem] border border-white/10 bg-[#0b0b10] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">04 · Place the words</p><div className="mt-4 space-y-2">{placementChoices.map((choice) => <button key={choice.id} type="button" onClick={() => setCaptionPlacement(choice.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${captionPlacement === choice.id ? "border-white bg-white text-black" : "border-white/10 bg-white/[.025] text-white hover:border-white/35"}`}><p className="text-sm font-black">{choice.label}</p><p className={`mt-1 text-xs ${captionPlacement === choice.id ? "text-black/65" : "text-zinc-500"}`}>{choice.detail}</p></button>)}</div></section>
          <section className="rounded-[1.75rem] border border-white/10 bg-[#0b0b10] p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">05 · Protect the frame</p><div className="mt-4 space-y-2">{safeZoneChoices.map((choice) => <button key={choice.id} type="button" onClick={() => setSafeZone(choice.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${safeZone === choice.id ? "border-[#f3d68b] bg-[#f3d68b]/10 text-white" : "border-white/10 bg-white/[.025] text-white hover:border-white/35"}`}><p className="text-sm font-black">{choice.label}</p><p className="mt-1 text-xs text-zinc-500">{choice.detail}</p></button>)}</div></section>
          <section className="rounded-[1.75rem] border border-white/10 bg-[#0b0b10] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">06 · Tune the type</p><p className="mt-2 text-lg font-black text-white">Make it yours.</p></div><button type="button" onClick={() => setCaptionTypography({ size: 1, color: null, highlightColor: null, background: null })} className="text-[10px] font-black uppercase tracking-[.12em] text-[#e8d2ff] underline underline-offset-4">Reset</button></div><label className="mt-5 block"><span className="flex items-center justify-between text-xs font-black text-zinc-300"><span>Type size</span><span>{captionTypography.size.toFixed(2)}×</span></span><input aria-label="Caption type size" type="range" min="0.65" max="1.45" step="0.05" value={captionTypography.size} onChange={(event) => setCaptionTypography((current) => ({ ...current, size: Number(event.target.value) }))} className="mt-3 w-full accent-[#e8d2ff]" /></label><div className="mt-5 grid grid-cols-2 gap-3"><label className="rounded-xl border border-white/10 bg-black/25 p-3"><span className="block text-[10px] font-black uppercase tracking-[.14em] text-zinc-500">Words</span><input aria-label="Caption text color" type="color" value={captionTypography.color || activeTemplate.color} onChange={(event) => setCaptionTypography((current) => ({ ...current, color: event.target.value }))} className="mt-3 h-10 w-full cursor-pointer rounded-lg border-0 bg-transparent" /></label><label className="rounded-xl border border-white/10 bg-black/25 p-3"><span className="block text-[10px] font-black uppercase tracking-[.14em] text-zinc-500">Live word</span><input aria-label="Caption highlight color" type="color" value={captionTypography.highlightColor || activeTemplate.highlightColor} onChange={(event) => setCaptionTypography((current) => ({ ...current, highlightColor: event.target.value }))} className="mt-3 h-10 w-full cursor-pointer rounded-lg border-0 bg-transparent" /></label></div></section>
          <section className="relative overflow-hidden rounded-[1.75rem] border border-[#e8d2ff]/25 bg-[radial-gradient(circle_at_82%_12%,rgba(232,210,255,.18),transparent_34%),linear-gradient(135deg,#170d21,#0a090d)] p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e8d2ff]">06 · Make the captioned master</p><h2 className="mt-4 max-w-md text-3xl font-black leading-[.9] tracking-[-.055em] text-white">Turn the timed words into a file you can actually watch.</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-300">The finished master keeps your selected moving source and its real spoken words together. Your video is not replaced with a stock stand-in.</p><button type="button" onClick={prepareCaptionedMaster} disabled={!project?.segments.length || project?.captionReviewStatus !== "creator_approved" || renderMaster.isPending || updatePresentation.isPending} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-[#e8d2ff] disabled:cursor-not-allowed disabled:opacity-40">{renderMaster.isPending || updatePresentation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing your master</> : project?.captionReviewStatus !== "creator_approved" ? <><Type className="h-4 w-4" /> Lock the real words first</> : <><Film className="h-4 w-4" /> Prepare my captioned master</>}</button>{project?.renderError && <p className="mt-4 rounded-xl border border-red-200/20 bg-red-200/10 px-3 py-2 text-xs font-bold leading-relaxed text-red-100">{project.renderError}</p>}</section>
        </div>

        {notice && <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.045] px-5 py-4 text-sm font-medium leading-relaxed text-white">{notice}</div>}
      </section>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} mode="single" title="Choose your caption source" subtitle="Only saved CreatorVault videos that can actually be read and played are offered here." confirmLabel="Use this video" assetEligibility={isEligibleCreatorVideo} onConfirm={(assets) => { const source = assets.find(isEligibleCreatorVideo); if (!source) return; setSelectedAsset(source); setProject(null); setCurrentTime(0); setPickerOpen(false); setLocation(`/creator/caption-stage?sourceAssetId=${encodeURIComponent(source.id)}`); }} />
    </main>
  );
}
