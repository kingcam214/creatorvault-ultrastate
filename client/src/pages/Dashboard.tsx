import { Link } from "wouter";
import {
  AudioLines,
  BadgeCheck,
  Crown,
  Film,
  FolderOpen,
  Image as ImageIcon,
  LibraryBig,
  Play,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";

type MetricProps = {
  label: string;
  value: number;
  note: string;
  icon: typeof Film;
  tone: "cyan" | "gold" | "violet" | "emerald";
};

const toneClasses = {
  cyan: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  gold: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  violet: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
};

function TruthMetric({ label, value, note, icon: Icon, tone }: MetricProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</p>
          <p className="mt-3 font-['Bebas_Neue'] text-5xl leading-none tracking-[0.07em] text-white">{value}</p>
          <p className="mt-3 text-xs leading-5 text-white/55">{note}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ href, eyebrow, title, detail, icon: Icon, featured = false }: {
  href: string;
  eyebrow: string;
  title: string;
  detail: string;
  icon: typeof Film;
  featured?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`group h-full cursor-pointer rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 ${featured ? "border-cyan-300/35 bg-gradient-to-br from-cyan-300/15 via-cyan-300/[0.07] to-transparent hover:border-cyan-200/70" : "border-white/10 bg-white/[0.045] hover:border-white/30 hover:bg-white/[0.07]"}`}>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${featured ? "border-cyan-200/35 bg-cyan-200/15 text-cyan-100" : "border-white/10 bg-black/20 text-white/75"}`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 font-['Space_Mono'] text-[9px] uppercase tracking-[0.14em] text-white/45">{eyebrow}</span>
        </div>
        <h2 className="font-['Bebas_Neue'] text-3xl tracking-[0.08em] text-white">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/60">{detail}</p>
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-cyan-100 transition group-hover:gap-3">Open workspace <Play className="h-3.5 w-3.5 fill-current" /></div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: mediaAssets, isLoading: mediaLoading } = trpc.mediaAssets.list.useQuery({ filter: "all", limit: 200 }, { staleTime: 30_000 });
  const { data: audioLibrary, isLoading: audioLoading } = trpc.audioIntelligence.listAssets.useQuery(undefined, { staleTime: 30_000 });
  const { data: proofs, isLoading: proofLoading } = trpc.creationProof.getMine.useQuery(undefined, { staleTime: 30_000 });

  const assets = (mediaAssets ?? []).filter((asset: any) => {
    const sourceUrl = String(asset.publicUrl || asset.storagePath || "");
    return String(asset.status || "").toLowerCase() === "ready"
      && Boolean(sourceUrl)
      && !/^https?:\/\/replicate\.delivery\//i.test(sourceUrl);
  });
  const videos = assets.filter((asset) => String(asset.assetType ?? asset.mimeType ?? "").toLowerCase().includes("video"));
  const images = assets.filter((asset) => String(asset.assetType ?? asset.mimeType ?? "").toLowerCase().includes("image"));
  const certifiedProofs = (proofs ?? []).filter((proof: any) => proof.status === "certified");
  const reviewQueue = (proofs ?? []).filter((proof: any) => proof.status === "candidate");
  const soundtrackCount = audioLibrary?.assets?.length ?? 0;
  const latestAsset = assets[0] as any | undefined;
  const latestIsVideo = latestAsset && String(latestAsset.assetType ?? latestAsset.mimeType ?? "").toLowerCase().includes("video");
  const latestIsAudio = latestAsset && String(latestAsset.assetType ?? latestAsset.mimeType ?? "").toLowerCase().includes("audio");
  const ownerName = user?.name || "KingCam";
  const loading = mediaLoading || audioLoading || proofLoading;

  return (
    <main className="min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-56 -top-40 h-[38rem] w-[38rem] rounded-full bg-cyan-400/[0.11] blur-[140px]" />
        <div className="absolute -bottom-60 right-[-10rem] h-[42rem] w-[42rem] rounded-full bg-violet-500/[0.10] blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_20%,rgba(255,255,255,0.02)_20.2%,transparent_20.4%)] bg-[length:18px_18px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8 md:pt-12">
        <header className="mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-9">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.24em] text-cyan-100/55">Owner creation command</p>
              <h1 className="mt-4 font-['Bebas_Neue'] text-5xl leading-[0.86] tracking-[0.07em] text-white sm:text-6xl md:text-7xl">{ownerName}<br /><span className="text-cyan-200">MAKE IT REAL.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/65">This is the truth layer: saved source media, cleared soundtracks, and watchable work that has actually earned its place.</p>
            </div>
            <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] px-5 py-4">
              <p className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.2em] text-cyan-100/60">Creation standard</p>
              <p className="mt-2 max-w-xs text-sm font-semibold leading-5 text-white">Nothing is called finished until it can be watched.</p>
            </div>
          </div>
        </header>

        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TruthMetric label="Ready sources" value={assets.length} note={loading ? "Reading your vault…" : "Readable media available for real creation."} icon={LibraryBig} tone="cyan" />
          <TruthMetric label="Video sources" value={videos.length} note="Real footage ready to inspect and direct." icon={Video} tone="gold" />
          <TruthMetric label="Soundtracks ready" value={soundtrackCount} note="Cleared audio with saved rhythm intelligence." icon={AudioLines} tone="violet" />
          <TruthMetric label="Signed-off proof" value={certifiedProofs.length} note={reviewQueue.length ? `${reviewQueue.length} piece${reviewQueue.length === 1 ? "" : "s"} awaiting review.` : "Only accepted watchable work appears here."} icon={BadgeCheck} tone="emerald" />
        </section>

        <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.2em] text-white/40">Fresh from your vault</p>
                <h2 className="mt-1 font-['Bebas_Neue'] text-3xl tracking-[0.07em] text-white">REAL SOURCE. NO REUPLOAD.</h2>
              </div>
              <Link href="/king/media-vault"><span className="text-xs font-semibold text-cyan-100">Open Vault →</span></Link>
            </div>
            {latestAsset ? (
              <div className="relative aspect-[16/9] bg-black">
                {latestIsVideo ? (
                  <video className="h-full w-full object-cover" src={latestAsset.publicUrl} muted autoPlay loop playsInline preload="metadata" />
                ) : latestIsAudio ? (
                  <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_30%_25%,rgba(168,85,247,.42),transparent_35%),linear-gradient(135deg,#071425,#0d0718)] p-7">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-200/30 bg-violet-300/15 text-violet-100"><AudioLines className="h-7 w-7" /></div>
                    <div>
                      <p className="font-['Bebas_Neue'] text-4xl tracking-[0.07em] text-white">SOUNDTRACK IN THE VAULT</p>
                      <audio className="mt-4 w-full" controls preload="metadata" src={latestAsset.publicUrl} />
                    </div>
                  </div>
                ) : (
                  <img className="h-full w-full object-cover" src={latestAsset.thumbnailUrl || latestAsset.publicUrl} alt="Latest verified source" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-6 pt-16">
                  <p className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.18em] text-cyan-100/70">Verified media</p>
                  <p className="mt-1 max-w-xl truncate text-sm font-semibold text-white">{latestAsset.originalName || latestAsset.fileName}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[19rem] flex-col items-center justify-center px-8 text-center">
                <FolderOpen className="h-10 w-10 text-cyan-100/45" />
                <p className="mt-5 font-['Bebas_Neue'] text-3xl tracking-[0.08em] text-white">YOUR VAULT IS READY</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/55">As soon as a verified source is available, it will appear here as a real creation starting point.</p>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30">
            <p className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.2em] text-white/40">Finished-work truth</p>
            <h2 className="mt-2 font-['Bebas_Neue'] text-3xl tracking-[0.07em] text-white">PROOF NEVER GETS FAKED.</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">CreatorVault keeps the difference clear: a saved source is not a finished drop, and a plan is not watchable proof.</p>
            <div className="mt-7 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4"><span className="text-sm text-white/70">Watchable pieces certified</span><span className="font-['Bebas_Neue'] text-3xl tracking-[0.08em] text-emerald-200">{certifiedProofs.length}</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4"><span className="text-sm text-white/70">Work awaiting proof review</span><span className="font-['Bebas_Neue'] text-3xl tracking-[0.08em] text-amber-100">{reviewQueue.length}</span></div>
            </div>
            <Link href="/king/content"><div className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20">Open KingCam Content <BadgeCheck className="h-4 w-4" /></div></Link>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-['Space_Mono'] text-[9px] uppercase tracking-[0.2em] text-white/40">Creation lanes</p>
              <h2 className="mt-1 font-['Bebas_Neue'] text-4xl tracking-[0.08em] text-white">START WITH WHAT YOU OWN.</h2>
            </div>
            <p className="max-w-sm text-xs leading-5 text-white/45">Every lane below begins with verified CreatorVault media. Nothing asks you to find the same file twice.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard href="/vault-x/studio" eyebrow="Cinema lane" title="Body Cinema" detail="Inspect your real footage, see the measured moments, and choose a treatment from source truth." icon={Film} featured />
            <ActionCard href="/creator/video-studio" eyebrow="Source first" title="Creator Video Studio" detail="Open saved footage in the creation lane that actually fits the job." icon={WandSparkles} />
            <ActionCard href="/king/media-vault" eyebrow="Your originals" title="Media Vault" detail="Watch, hear, and select verified video, image, and governed soundtrack assets." icon={FolderOpen} />
            <ActionCard href="/social" eyebrow="Distribution" title="Social Empire" detail="Take the exact source you selected into a real packaging and distribution workspace." icon={Crown} />
          </div>
        </section>
      </div>
    </main>
  );
}
