import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Crown, Image as ImageIcon, Loader2, ShieldCheck, Sparkles, Video } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { HOMEPAGE_MEDIA, hasCertifiedPublicProof } from "@/lib/homepageMediaRegistry";

const T = {
  bg: "#070707",
  panel: "#101010",
  panelDeep: "#0b0b0b",
  border: "rgba(255,255,255,0.10)",
  text: "#f5f0e8",
  muted: "#a8a39a",
  gold: "#c9a84c",
  goldGlow: "rgba(201,168,76,0.32)",
  cyan: "#00d9ff",
};

type CampaignSource = {
  id: string;
  label: string;
  sourceUrl: string;
  classification: string;
};

function durableOutput(job: any): string | null {
  const candidate = job?.metadata?.designImagePilotOutput?.durableUrl;
  return typeof candidate === "string" && candidate.startsWith("https://creatorvault.live/uploads/") ? candidate : null;
}

export default function CampaignVisualStudio() {
  const sourcesQ = (trpc as any).campaignVisual.sources.useQuery();
  const createDraft = (trpc as any).campaignVisual.createDraft.useMutation();
  const approve = (trpc as any).governedPollo.approve.useMutation();
  const permit = (trpc as any).governedPollo.authorizeSingleUseSubmission.useMutation();
  const submit = (trpc as any).governedPollo.submitApproved.useMutation();
  const poll = (trpc as any).governedPollo.pollProviderStatus.useMutation();

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [job, setJob] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState<"draft" | "start" | "check" | null>(null);

  const sources = (sourcesQ.data ?? []) as CampaignSource[];
  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [sources, selectedSourceId],
  );
  const jobOutputUrl = durableOutput(job);
  const acceptedCampaignProof = HOMEPAGE_MEDIA.campaignVisualProof;
  const acceptedProofUrl = hasCertifiedPublicProof(acceptedCampaignProof) ? acceptedCampaignProof.livePath : null;
  const outputUrl = jobOutputUrl || acceptedProofUrl;
  const acceptedToVault = Boolean(jobOutputUrl) && job?.state === "accepted" && Boolean(job?.metadata?.acceptedCampaignVisualAssetId);
  const showingAcceptedExample = !jobOutputUrl && Boolean(acceptedProofUrl);

  const prepare = async () => {
    if (!selectedSource) return;
    setWorking("draft");
    setNotice(null);
    try {
      const result = await createDraft.mutateAsync({ sourceAssetId: selectedSource.id });
      setJob(result.job);
      setNotice(result.reused
        ? "This visual is already lined up. The one-visual ceiling and quality check stay in place."
        : "Your visual is lined up from the certified source. Nothing has been made yet.");
    } catch (error: any) {
      setNotice("CreatorVault could not get your visual ready right now. Nothing was made.");
    } finally {
      setWorking(null);
    }
  };

  const start = async () => {
    if (!job?.id || !job?.fingerprint) return;
    setWorking("start");
    setNotice(null);
    try {
      await approve.mutateAsync({ jobId: job.id, fingerprint: job.fingerprint, reason: "Owner-directed CreatorVault campaign visual from certified saved media." });
      await permit.mutateAsync({
        jobId: job.id,
        fingerprint: job.fingerprint,
        hardCreditCap: 100,
        reason: "One premium campaign visual, one certified source, one output, mandatory review.",
        expiresInMinutes: 15,
      });
      const submitted = await submit.mutateAsync({ jobId: job.id, workerId: "campaign-visual-studio" });
      setJob(submitted);
      setNotice("Your visual is being made. It stays out of your Media Vault until the finished image meets the standard.");
    } catch (error: any) {
      setNotice("CreatorVault could not begin your visual right now. Nothing was made.");
    } finally {
      setWorking(null);
    }
  };

  const check = async () => {
    if (!job?.id) return;
    setWorking("check");
    setNotice(null);
    try {
      const updated = await poll.mutateAsync({ jobId: job.id });
      setJob(updated);
      const finished = durableOutput(updated);
      setNotice(finished
        ? "Your finished visual is ready to look at. It stays out of your Media Vault until it meets the standard."
        : "Your visual is still being made. No second visual was started.");
    } catch (error: any) {
      setNotice("CreatorVault could not check your visual right now. Nothing new was made.");
    } finally {
      setWorking(null);
    }
  };

  const sourceReady = Boolean(selectedSource);
  const staged = Boolean(job?.id);
  const submitted = ["submitted", "submission_unknown", "provider_complete", "quality_review", "accepted", "rejected", "failed"].includes(String(job?.state || ""));

  return (
    <main className="min-h-screen bg-[#070707] px-4 pb-24 pt-10 text-[#f5f0e8] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/king/content">
          <a className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to KingCam Content</a>
        </Link>

        <section className="relative mt-7 overflow-hidden rounded-[2rem] border border-[#c9a84c]/30 bg-[#0e0d0a] px-6 py-10 shadow-[0_35px_100px_-55px_rgba(201,168,76,0.65)] sm:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(201,168,76,0.19),transparent_32%),radial-gradient(circle_at_8%_100%,rgba(0,217,255,0.10),transparent_35%)]" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#e8d38b]"><Crown className="h-3.5 w-3.5" /> Owner campaign visual</div>
            <h1 className="mt-5 font-serif text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">Turn a real vault moment into campaign power.</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">This lane never asks for a link or re-upload. It starts with a certified CreatorVault source, keeps the woman in the shot, and makes one premium visual with the cost visible before anything happens.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-[#101010] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c9a84c]">Certified source only</p>
                <h2 className="mt-2 text-2xl font-black text-white">Choose the moment that carries the campaign.</h2>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-[#00d9ff]"><ShieldCheck className="h-5 w-5" /></div>
            </div>

            <div className="mt-6 grid gap-4">
              {sourcesQ.isLoading && <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-sm font-bold text-zinc-400">Checking your certified CreatorVault sources…</div>}
              {!sourcesQ.isLoading && sources.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-sm leading-relaxed text-zinc-400">No campaign source is certified right now. CreatorVault will not substitute generic media or use a source that has not cleared the visual and consent boundary.</div>}
              {sources.map((source) => {
                const selected = source.id === selectedSourceId;
                return (
                  <button
                    key={source.id}
                    onClick={() => { setSelectedSourceId(source.id); setJob(null); setNotice(null); }}
                    className="group overflow-hidden rounded-2xl border text-left transition"
                    style={{ borderColor: selected ? T.gold : T.border, background: selected ? "rgba(201,168,76,0.08)" : T.panelDeep, boxShadow: selected ? `0 0 35px ${T.goldGlow}` : "none" }}
                  >
                    <div className="relative aspect-video overflow-hidden bg-black">
                      <video src={source.sourceUrl} muted loop playsInline autoPlay={selected} preload="metadata" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white"><Video className="h-3.5 w-3.5 text-[#c9a84c]" /> Verified CreatorVault media</div>
                      {selected && <div className="absolute right-4 top-4 rounded-full bg-[#c9a84c] p-2 text-black"><CheckCircle2 className="h-4 w-4" /></div>}
                    </div>
                    <div className="flex items-center justify-between gap-4 p-5"><div><p className="font-black text-white">{source.label}</p><p className="mt-1 text-sm text-zinc-500">Full-body, female-only campaign reference</p></div><ArrowUpRight className="h-5 w-5 text-zinc-500 transition group-hover:text-[#c9a84c]" /></div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-white/10 bg-[#101010] p-5 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00d9ff]">Creation terms</p>
            <h2 className="mt-2 text-2xl font-black text-white">One visual. No surprises.</h2>
            <div className="mt-6 space-y-3">
              {[
                ["Source", selectedSource ? "Certified saved CreatorVault media" : "Choose your certified source"],
                ["Visual", "One 16:9 premium campaign image"],
                ["Cost", "A firm 100-credit ceiling. One visual only."],
                ["Finish", "The finished image is checked before it reaches your Media Vault."],
              ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</p><p className="mt-1 text-sm font-bold text-zinc-200">{value}</p></div>)}
            </div>

            {!staged ? (
              <button disabled={!sourceReady || working === "draft"} onClick={prepare} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#c9a84c] px-5 py-4 text-sm font-black text-black transition hover:bg-[#e0c165] disabled:cursor-not-allowed disabled:opacity-40">
                {working === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Get My Visual Ready
              </button>
            ) : !submitted ? (
              <button disabled={working === "start"} onClick={start} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#c9a84c] px-5 py-4 text-sm font-black text-black transition hover:bg-[#e0c165] disabled:opacity-50">
                {working === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Make My Visual
              </button>
            ) : !jobOutputUrl ? (
              <button disabled={working === "check"} onClick={check} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#00d9ff]/45 bg-[#00d9ff]/10 px-5 py-4 text-sm font-black text-[#a7efff] transition hover:bg-[#00d9ff]/15 disabled:opacity-50">
                {working === "check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Check My Finished Visual
              </button>
            ) : null}

            {notice && <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-zinc-300">{notice}</div>}
          </aside>
        </section>

        {outputUrl && <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-[#c9a84c]/35 bg-[#101010] p-5 sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c9a84c]">{showingAcceptedExample ? "Accepted CreatorVault visual" : acceptedToVault ? "Your accepted visual" : "Your finished visual"}</p><h2 className="mt-2 text-2xl font-black text-white">{showingAcceptedExample ? "See what a finished campaign visual looks like." : acceptedToVault ? "Your visual is ready in the Vault." : "Your visual is here to look at."}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{showingAcceptedExample ? "This is a real accepted CreatorVault campaign image made from certified source media. It is here to show the level—not to stand in for your own visual." : acceptedToVault ? "This visual met the standard and is saved as a ready reusable piece in your Media Vault." : "This visual stays out of your Media Vault until it meets the same female-only, source-preserving, no-generic-image standard."}</p>{(acceptedToVault || showingAcceptedExample) && <Link href="/king/media-vault"><a className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#e8d38b] hover:text-white">See it in Media Vault <ArrowUpRight className="h-4 w-4" /></a></Link>}</div><ShieldCheck className="h-6 w-6 text-[#c9a84c]" /></div><img src={outputUrl} alt={showingAcceptedExample || acceptedToVault ? "Accepted CreatorVault campaign visual" : "Finished CreatorVault campaign visual awaiting review"} className="w-full rounded-2xl border border-white/10 bg-black object-cover" /></section>}
      </div>
    </main>
  );
}
