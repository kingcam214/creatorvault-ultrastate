import { type CSSProperties, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const T = {
  bg: "#080808",
  panel: "#101010",
  panel2: "#151515",
  border: "#252018",
  text: "#f7efe1",
  sub: "#b7aa91",
  muted: "#766d5d",
  gold: "#d6b25e",
  green: "#61d394",
  red: "#ff6b6b",
};

const ACTIVATION_STEPS = [
  { id: "profile-proof", title: "Profile Proof", copy: "Capture the creator positioning evidence that makes a buyer trust the offer." },
  { id: "paid-offer", title: "Paid Offer", copy: "Package the first paid outcome with a direct price and buyer promise." },
  { id: "content-upload", title: "Content Upload", copy: "Attach monetizable proof content that can be repurposed into a sales asset." },
  { id: "telegram-drop", title: "Telegram Drop", copy: "Move the offer into the private-alert channel where warm buyers can respond." },
  { id: "buyer-followup", title: "Buyer Follow-Up", copy: "Record the follow-up action that pushes the buyer toward payment." },
];

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "X", "Telegram", "OnlyFans", "Website"];

type FieldProps = { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; type?: string };
function Field({ label, value, onChange, textarea, type = "text" }: FieldProps) {
  return <label style={{ display: "grid", gap: 8 }}>
    <span style={labelStyle}>{label}</span>
    {textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={inputStyle as CSSProperties} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />}
  </label>;
}

export function OnboardingV2() {
  const [creatorType, setCreatorType] = useState("service creator");
  const [primaryGoal, setPrimaryGoal] = useState("Launch a paid creator monetization path that can close the first buyer within seven days");
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState("5000");
  const [platforms, setPlatforms] = useState<string[]>(["Instagram", "Telegram"]);
  const [stepResults, setStepResults] = useState<Record<string, string>>({});

  const progress = trpc.onboardingV2.getV2Progress.useQuery(undefined, { staleTime: 10000 });
  const start = trpc.onboardingV2.startV2Onboarding.useMutation({ onSuccess: () => progress.refetch() });
  const completeStep = trpc.onboardingV2.completeV2Step.useMutation({ onSuccess: () => progress.refetch() });

  const completedStepIds = useMemo(() => new Set(((progress.data as any)?.completedStepIds ?? []).map(String)), [progress.data]);
  const incomeGoalNumber = Number(monthlyIncomeGoal);
  const canStart = creatorType.trim().length >= 2 && primaryGoal.trim().length >= 2 && Number.isFinite(incomeGoalNumber) && incomeGoalNumber > 0 && platforms.length > 0;
  const activationPlan = (start.data as any)?.onboarding ? String((start.data as any).onboarding) : "";
  const latestStartedArtifactId = (start.data as any)?.artifactId ? String((start.data as any).artifactId) : "";
  const latestStepArtifactId = (completeStep.data as any)?.artifactId ? String((completeStep.data as any).artifactId) : "";

  function togglePlatform(platform: string) {
    setPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  }

  async function startActivation() {
    if (!canStart) return;
    await start.mutateAsync({ creatorType: creatorType.trim(), primaryGoal: primaryGoal.trim(), monthlyIncomeGoal: incomeGoalNumber, platforms });
  }

  async function markStepComplete(stepId: string) {
    await completeStep.mutateAsync({ stepId, result: stepResults[stepId]?.trim() || undefined });
  }

  return <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top left, rgba(214,178,94,.13), transparent 34%), ${T.bg}`, color: T.text, padding: 32 }}>
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 22 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
        <div>
          <div style={{ color: T.gold, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".16em" }}>CreatorVault V2 Activation</div>
          <h1 style={{ fontSize: 42, lineHeight: 1, margin: "10px 0 8px", letterSpacing: "-.04em" }}>Revenue onboarding wired to live persistence.</h1>
          <p style={{ color: T.sub, maxWidth: 780, fontSize: 16 }}>This cockpit starts the creator activation workflow, saves every completed step as a real content artifact, writes Empire Agent Reports, and displays returned artifact IDs from the production contract.</p>
        </div>
        <button disabled={!canStart || start.isPending} onClick={startActivation} style={{ background: canStart ? T.gold : T.border, color: "#111", border: 0, borderRadius: 14, padding: "15px 22px", fontWeight: 900, cursor: canStart ? "pointer" : "not-allowed" }}>{start.isPending ? "Generating Activation..." : "Start V2 Activation"}</button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1.02fr .98fr", gap: 18 }}>
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Creator Revenue Inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Creator type" value={creatorType} onChange={setCreatorType} />
            <Field label="Monthly income goal" value={monthlyIncomeGoal} onChange={setMonthlyIncomeGoal} type="number" />
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Primary paid outcome" value={primaryGoal} onChange={setPrimaryGoal} textarea />
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <span style={labelStyle}>Revenue channels</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PLATFORM_OPTIONS.map((platform) => {
                const active = platforms.includes(platform);
                return <button key={platform} onClick={() => togglePlatform(platform)} style={{ border: `1px solid ${active ? T.gold : T.border}`, background: active ? "rgba(214,178,94,.13)" : T.panel2, color: active ? T.gold : T.sub, borderRadius: 999, padding: "9px 12px", fontWeight: 800, cursor: "pointer" }}>{platform}</button>;
              })}
            </div>
          </div>
          {start.error && <p style={{ color: T.red }}>{start.error.message}</p>}
          {latestStartedArtifactId && <div style={{ ...badgeStyle, marginTop: 16 }}>Persisted start artifact: {latestStartedArtifactId}</div>}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitle}>Live Activation Progress</h2>
          {progress.error && <p style={{ color: T.red }}>{progress.error.message}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <Metric label="Progress" value={`${Number((progress.data as any)?.progress ?? 0)}%`} />
            <Metric label="Level" value={String((progress.data as any)?.level ?? "loading")} />
            <Metric label="Next milestone" value={String((progress.data as any)?.nextMilestone ?? "loading")} />
            <Metric label="Artifact count" value={String((progress.data as any)?.artifactCount ?? 0)} />
          </div>
          <div style={{ marginTop: 16, height: 12, borderRadius: 999, background: "#0b0b0b", border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.max(0, Number((progress.data as any)?.progress ?? 0)))}%`, height: "100%", background: `linear-gradient(90deg, ${T.gold}, ${T.green})` }} />
          </div>
          <p style={{ color: T.muted, fontSize: 13 }}>Progress comes from content rows with contentType creator_onboarding_v2_step for the authenticated user.</p>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitle}>Activation Step Proof Capture</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {ACTIVATION_STEPS.map((step) => {
            const completed = completedStepIds.has(step.id);
            return <div key={step.id} style={{ background: "#0d0d0d", border: `1px solid ${completed ? "rgba(97,211,148,.45)" : T.border}`, borderRadius: 16, padding: 15, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <b style={{ color: completed ? T.green : T.text }}>{step.title}</b>
                <span style={{ color: completed ? T.green : T.gold, fontSize: 12, fontWeight: 900 }}>{completed ? "Persisted" : "Ready"}</span>
              </div>
              <p style={{ color: T.sub, margin: 0, fontSize: 13, lineHeight: 1.45 }}>{step.copy}</p>
              <textarea value={stepResults[step.id] ?? ""} onChange={(e) => setStepResults((current) => ({ ...current, [step.id]: e.target.value }))} rows={3} style={inputStyle as CSSProperties} />
              <button onClick={() => markStepComplete(step.id)} disabled={completeStep.isPending} style={{ background: completed ? "rgba(97,211,148,.12)" : T.panel2, border: `1px solid ${completed ? T.green : T.gold}`, color: completed ? T.green : T.gold, borderRadius: 12, padding: 12, fontWeight: 900, cursor: completeStep.isPending ? "wait" : "pointer" }}>{completeStep.isPending ? "Saving..." : completed ? "Save Additional Proof" : "Complete Step"}</button>
            </div>;
          })}
        </div>
        {completeStep.error && <p style={{ color: T.red }}>{completeStep.error.message}</p>}
        {latestStepArtifactId && <div style={{ ...badgeStyle, marginTop: 16 }}>Persisted step artifact: {latestStepArtifactId} • XP {(completeStep.data as any)?.xpEarned}</div>}
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitle}>Generated Activation Plan</h2>
        {activationPlan ? <><div style={badgeStyle}>Persisted: {(start.data as any)?.persisted ? "true" : "false"} • User {(start.data as any)?.userId}</div><pre style={preStyle}>{activationPlan}</pre></> : <p style={{ color: T.muted }}>Start V2 Activation to generate and persist the creator onboarding plan through the live backend. Empty model output is surfaced as an error by the API.</p>}
      </section>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14 }}>
    <div style={{ color: T.muted, textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, fontWeight: 900 }}>{label}</div>
    <div style={{ color: T.text, fontSize: 22, fontWeight: 900, marginTop: 8, overflowWrap: "anywhere" }}>{value}</div>
  </div>;
}

const cardStyle: CSSProperties = { background: "rgba(16,16,16,.88)", border: `1px solid ${T.border}`, borderRadius: 22, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,.3)" };
const sectionTitle: CSSProperties = { margin: "0 0 16px", fontSize: 18, letterSpacing: "-.02em" };
const labelStyle: CSSProperties = { color: T.sub, fontSize: 12, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 800 };
const inputStyle: CSSProperties = { background: "#0b0b0b", border: `1px solid ${T.border}`, color: T.text, borderRadius: 12, padding: "13px 14px", outline: "none", fontSize: 14 };
const badgeStyle: CSSProperties = { display: "inline-block", color: T.green, background: "rgba(97,211,148,.1)", border: "1px solid rgba(97,211,148,.25)", borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 800, marginBottom: 12 };
const preStyle: CSSProperties = { whiteSpace: "pre-wrap", background: "#090909", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, color: T.text, lineHeight: 1.5, maxHeight: 620, overflow: "auto" };

export default OnboardingV2;
