import { ArrowUpRight, Film, LoaderCircle, Play, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { HOMEPAGE_MEDIA, hasCertifiedPublicProof } from "@/lib/homepageMediaRegistry";

export function MotionFlyerAgent() {
  const flyersQuery = trpc.flyerStudio.getFlyers.useQuery();
  const createProof = trpc.flyerStudio.createCertifiedProof.useMutation({
    onSuccess: () => flyersQuery.refetch(),
  });
  const newestReadyFlyer = flyersQuery.data?.flyers.find((flyer: any) => flyer.status === "ready" && flyer.artifactUrl);
  const certifiedSample = HOMEPAGE_MEDIA.motionFlyerProof;
  const sampleIsApproved = hasCertifiedPublicProof(certifiedSample);
  const visibleFlyerUrl = newestReadyFlyer?.artifactUrl || (sampleIsApproved ? certifiedSample.livePath : null);
  const isOwnerFlyer = Boolean(newestReadyFlyer?.artifactUrl);

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white">
      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(189,139,57,.18),transparent_33%),linear-gradient(135deg,#080706,#161008_58%,#080706)]" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
          <div className="flex items-center justify-between border-b border-white/15 pb-5">
            <div className="flex items-center gap-3"><Film className="h-5 w-5 text-[#efd18c]" /><span className="text-xs font-black uppercase tracking-[.2em] text-[#f3d899]">Motion Flyer</span></div>
            <Link href="/king/content"><a className="text-xs font-black uppercase tracking-[.15em] text-zinc-300 transition hover:text-white">Creation room</a></Link>
          </div>

          <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:py-16">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#efd18c]">CreatorVault design weapon</p>
              <h1 className="mt-5 text-5xl font-black leading-[.83] tracking-[-.075em] sm:text-7xl">Turn a moment<br />into a <span className="text-[#f3d899]">moving</span><br />reason to stop.</h1>
              <p className="mt-7 max-w-lg text-base leading-relaxed text-zinc-300 sm:text-lg">This lane creates a real six-second motion flyer, stores it inside CreatorVault, and gives you a video you can actually play. Nothing here is a text outline pretending to be a finished design.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => createProof.mutate()}
                  disabled={createProof.isPending}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f3d899] px-7 font-black text-[#19130c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createProof.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {createProof.isPending ? "Building your motion flyer" : "Build the certified motion flyer"}
                </button>
                <Link href="/king/media-vault"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/25 px-7 font-black text-white transition hover:bg-white/10">Open Media Vault <ArrowUpRight className="h-4 w-4" /></a></Link>
              </div>
              {createProof.error ? <p className="mt-5 text-sm font-semibold text-red-300">The flyer could not be prepared yet. The source was not treated as complete.</p> : null}
            </div>

            <div className="relative min-h-[37rem] overflow-hidden border border-white/15 bg-black sm:min-h-[43rem]">
              {visibleFlyerUrl ? (
                <video src={String(visibleFlyerUrl)} autoPlay loop muted playsInline controls className="absolute inset-0 h-full w-full object-cover" aria-label={isOwnerFlyer ? "Your completed CreatorVault Motion Flyer" : "Accepted CreatorVault Motion Flyer example"} />
              ) : (
                <div className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(180deg,rgba(8,7,6,.04),rgba(8,7,6,.94))] p-7 sm:p-10">
                  <div className="mb-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#efd18c]/50 bg-black/30"><Play className="ml-0.5 h-4 w-4 fill-[#efd18c] text-[#efd18c]" /></div>
                  <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#efd18c]">A real sample is getting ready</p>
                  <p className="mt-4 max-w-md text-3xl font-black leading-tight">The player opens only for a real moving flyer. Nothing is being faked here.</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(8,7,6,.82),transparent)] p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#efd18c]">{isOwnerFlyer ? "Saved inside CreatorVault" : "Accepted CreatorVault example"}</p>
                <p className="mt-2 text-lg font-black">{isOwnerFlyer && newestReadyFlyer?.headline ? String(newestReadyFlyer.headline) : "Watch a real finished motion flyer."}</p>
              </div>
            </div>
          </div>

          <div className="grid border-t border-white/15 pt-5 text-xs font-black uppercase tracking-[.15em] text-zinc-300 sm:grid-cols-3"><span>Real moving output</span><span className="sm:text-center">CreatorVault storage</span><span className="sm:text-right">Watch before you use it</span></div>
        </div>
      </section>
    </main>
  );
}

export default MotionFlyerAgent;
