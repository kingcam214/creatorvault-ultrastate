import { ArrowLeft, CheckCircle2, Clock3, FileVideo, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const GOLD = "#D5B760";
const BG = "#070707";
const CARD = "#111111";
const BORDER = "rgba(255,255,255,0.09)";
const MUTED = "rgba(255,255,255,0.58)";
const GREEN = "#45E38A";
const RED = "#FF7C7C";

function short(value?: string | null, length = 14) {
  if (!value) return "Not recorded";
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function timestamp(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function seconds(value?: number | null) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(Number(value) / 100) / 10}s`;
}

function statusTone(state?: string) {
  if (["accepted"].includes(state || "")) return GREEN;
  if (["rejected", "failed", "cancelled"].includes(state || "")) return RED;
  return GOLD;
}

export default function VaultXTruthLibrary() {
  const [matched, params] = useRoute<{ jobId: string }>("/vault-x/library/:jobId");
  const routeJobId = matched && params ? params.jobId : "0";
  const jobId = Number(routeJobId);
  const validJobId = matched && Number.isInteger(jobId) && jobId > 0;
  const jobQuery = trpc.governedPollo.job.useQuery({ jobId: validJobId ? jobId : 1 }, { enabled: validJobId });
  const eventsQuery = trpc.governedPollo.events.useQuery({ jobId: validJobId ? jobId : 1 }, { enabled: validJobId });
  const job = jobQuery.data as any;
  const evidenceId = String(job?.metadata?.bodyCinemaEvidenceId || "");
  const evidenceQuery = (trpc as any).bodyCinema.getSourceEvidence.useQuery({ evidenceId }, { enabled: Boolean(evidenceId) });
  const evidence = evidenceQuery.data as any;
  const selectedDirection = evidence?.directions?.find((direction: any) => direction.id === evidence?.selectedDirectionId);
  const loading = jobQuery.isLoading || (Boolean(evidenceId) && evidenceQuery.isLoading);

  if (!validJobId) {
    return <div style={{ minHeight: "100vh", background: BG, color: "#fff", padding: 32, fontFamily: "DM Sans, sans-serif" }}><p>That Truth Library record is not valid.</p></div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 64 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(7,7,7,0.94)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/vault-x/studio" aria-label="Back to Body Cinema" style={{ color: MUTED, display: "inline-flex" }}><ArrowLeft size={20} /></Link>
          <div>
            <p style={{ margin: 0, color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>CreatorVault</p>
            <h1 style={{ margin: "2px 0 0", fontSize: 20, lineHeight: 1, letterSpacing: "-0.03em" }}>Truth Library</h1>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 18px" }}>
        <section style={{ marginBottom: 24 }}>
          <p style={{ color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px" }}>This is the record—not a promise</p>
          <h2 style={{ margin: 0, fontSize: 34, letterSpacing: "-0.045em" }}>Everything Body Cinema used, chose, and decided.</h2>
          <p style={{ color: MUTED, lineHeight: 1.6, margin: "10px 0 0", maxWidth: 620 }}>This page only shows stored evidence from your source, chosen plan, cost gate, render state, and review history. If something has not happened, it says so.</p>
        </section>

        {loading && <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20, color: MUTED }}>Loading the stored record…</div>}
        {jobQuery.error && <div style={{ background: "rgba(255,124,124,0.1)", border: "1px solid rgba(255,124,124,0.35)", borderRadius: 18, padding: 20, color: RED }}>This record cannot be opened: {jobQuery.error.message}</div>}

        {job && <div style={{ display: "grid", gap: 16 }}>
          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
              <div><p style={{ margin: 0, color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Production request</p><p style={{ margin: "6px 0 0", fontSize: 21, fontWeight: 900 }}>Request {short(job.requestId, 16)}</p></div>
              <span style={{ color: statusTone(job.state), border: `1px solid ${statusTone(job.state)}55`, borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{String(job.state).replaceAll("_", " ")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 18 }}>
              <div><p style={{ color: MUTED, fontSize: 10, margin: 0 }}>SOURCE CHECKSUM</p><p style={{ margin: "4px 0 0", fontFamily: "monospace", fontSize: 12 }}>{short(job.sourceChecksum, 20)}</p></div>
              <div><p style={{ color: MUTED, fontSize: 10, margin: 0 }}>CREATED</p><p style={{ margin: "4px 0 0", fontSize: 12 }}>{timestamp(job.createdAt)}</p></div>
              <div><p style={{ color: MUTED, fontSize: 10, margin: 0 }}>ESTIMATED COST</p><p style={{ margin: "4px 0 0", fontSize: 12, color: job.estimatedCostCredits ? GOLD : MUTED }}>{job.estimatedCostCredits ? `${job.estimatedCostCredits} credits` : "Not approved"}</p></div>
              <div><p style={{ color: MUTED, fontSize: 10, margin: 0 }}>ACTUAL COST</p><p style={{ margin: "4px 0 0", fontSize: 12 }}>{job.actualCostCredits ? `${job.actualCostCredits} credits` : "No render cost recorded"}</p></div>
            </div>
          </section>

          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><FileVideo size={17} color={GOLD} /><h3 style={{ margin: 0, fontSize: 18 }}>Source evidence</h3></div>
            {!evidence && !evidenceQuery.isLoading && <p style={{ color: MUTED, margin: 0, lineHeight: 1.6 }}>No source-analysis record is available for this request.</p>}
            {evidence && <>
              <p style={{ color: MUTED, margin: "0 0 14px", lineHeight: 1.55 }}>Analysis status: <strong style={{ color: evidence.analysisStatus === "verified" ? GREEN : RED }}>{evidence.analysisStatus}</strong>. {evidence.frameEvidence?.length || 0} sampled frames were stored with this record.</p>
              <div style={{ display: "grid", gap: 10 }}>
                {(evidence.shotRankings || []).slice(0, 3).map((shot: any, index: number) => <div key={`${shot.timestampMs}-${index}`} style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}><p style={{ margin: 0, fontWeight: 900, fontSize: 13 }}>Strong moment {index + 1} · {seconds(shot.timestampMs)}</p><p style={{ margin: "5px 0 0", color: MUTED, fontSize: 12, lineHeight: 1.5 }}>{shot.reason}</p></div>)}
              </div>
            </>}
          </section>

          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><LockKeyhole size={17} color={GOLD} /><h3 style={{ margin: 0, fontSize: 18 }}>Approved cinematic plan</h3></div>
            {!selectedDirection && <p style={{ color: MUTED, margin: 0 }}>No direction has been approved for this source.</p>}
            {selectedDirection && <>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 16 }}>{selectedDirection.label}</p>
              <p style={{ color: MUTED, margin: "6px 0 16px", lineHeight: 1.55 }}>{selectedDirection.distinction}</p>
              <div style={{ display: "grid", gap: 10 }}>{(selectedDirection.timeline || []).map((beat: any) => <div key={beat.id} style={{ display: "grid", gridTemplateColumns: "82px 1fr", gap: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}><span style={{ color: GOLD, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{beat.id} · {seconds(beat.sourceTimestampMs)}</span><div><p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{beat.direction}</p><p style={{ margin: "4px 0 0", color: MUTED, fontSize: 11 }}>{beat.crop}</p></div></div>)}</div>
            </>}
          </section>

          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><FileVideo size={17} color={GOLD} /><h3 style={{ margin: 0, fontSize: 18 }}>Editor decisions</h3></div>
            {!evidence?.editorFindings && <p style={{ color: MUTED, margin: 0 }}>No editor decisions have been recorded for this source.</p>}
            {evidence?.editorFindings && (
              <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Strongest Hook</span><span style={{ color: "#fff" }}>{seconds(evidence.editorFindings.strongestHookTimestampMs)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Best Thumbnail</span><span style={{ color: "#fff" }}>{seconds(evidence.editorFindings.strongestThumbnailTimestampMs)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Peak Commercial Moment</span><span style={{ color: "#fff" }}>{seconds(evidence.editorFindings.strongestCommercialTimestampMs)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Weakest Section (Cut)</span><span style={{ color: "#fff" }}>{seconds(evidence.editorFindings.weakestSectionStartMs)} - {seconds(evidence.editorFindings.weakestSectionEndMs)}</span></div>
              </div>
            )}
          </section>

          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><LockKeyhole size={17} color={GOLD} /><h3 style={{ margin: 0, fontSize: 18 }}>Monetization package</h3></div>
            {!selectedDirection && <p style={{ color: MUTED, margin: 0 }}>No direction has been approved for this source.</p>}
            {selectedDirection && (
              <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>PPV Master</span><span style={{ color: "#fff" }}>15s • 9:16 • Paid payoff</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Social Teaser</span><span style={{ color: "#fff" }}>6s • 9:16 • Public hook</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Cover Image</span><span style={{ color: "#fff" }}>Gallery cover from reveal</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Headline</span><span style={{ color: "#fff" }}>{selectedDirection.id === "vip-tease" || selectedDirection.id === "luxury-reveal" ? "Exclusive Private Reveal" : "The Arch Collection"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}><span style={{ color: MUTED }}>Suggested Price</span><span style={{ color: GOLD, fontWeight: 800 }}>${selectedDirection.id === "vip-tease" || selectedDirection.id === "luxury-reveal" ? "25" : "15"}</span></div>
              </div>
            )}
          </section>

          <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><Clock3 size={17} color={GOLD} /><h3 style={{ margin: 0, fontSize: 18 }}>Decision history</h3></div>
            {(eventsQuery.data as any[] | undefined)?.length ? <div style={{ display: "grid", gap: 12 }}>{(eventsQuery.data as any[]).map((event: any) => <div key={event.id} style={{ display: "flex", gap: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}><ShieldCheck size={16} color={GOLD} /><div><p style={{ margin: 0, fontSize: 12, fontWeight: 900 }}>{String(event.eventType).replaceAll("_", " ")}</p><p style={{ margin: "4px 0 0", color: MUTED, fontSize: 11 }}>{timestamp(event.createdAt)}</p></div></div>)}</div> : <p style={{ color: MUTED, margin: 0 }}>No additional decisions have been recorded.</p>}
          </section>

          {job.artifactUrl ? <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}><CheckCircle2 size={17} color={GREEN} /><h3 style={{ margin: 0, fontSize: 18 }}>Accepted output</h3></div><video src={job.artifactUrl} controls playsInline style={{ width: "100%", borderRadius: 14, display: "block", background: "#000" }} /></section> : <section style={{ background: "rgba(213,183,96,0.06)", border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, display: "flex", gap: 10 }}><XCircle size={18} color={GOLD} /><p style={{ margin: 0, color: MUTED, lineHeight: 1.55 }}>There is no accepted output on this record yet. This library does not substitute a demo video for a creator result.</p></section>}
        </div>}
      </main>
    </div>
  );
}
