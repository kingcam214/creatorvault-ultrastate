import { useMemo } from "react";
import { Link } from "wouter";
import { Activity, AlertTriangle, ArrowLeft, Bot, DollarSign, Pause, Play, RefreshCw, Shield, Target, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ownerEmails = new Set([
  "admin@creatorvault.com",
  "kingcam@creatorvault.com",
  "cam@creatorvault.com",
]);

function money(value: unknown) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function pct(value: unknown) {
  const n = Number(value ?? 0);
  return `${Number.isFinite(n) ? n.toFixed(1) : "0.0"}%`;
}

function StatCard({ label, value, sub, tone = "#c9a84c" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 18 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: tone, lineHeight: 1 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.48)", marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
}

export default function AgentLive() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const isOwner = useMemo(() => {
    const role = String((user as any)?.role ?? "").toLowerCase();
    const email = String((user as any)?.email ?? "").toLowerCase();
    return role === "owner" || role === "admin" || ownerEmails.has(email);
  }, [user]);

  const status = (trpc.agentTelemetry as any).getLiveOperationsStatus.useQuery(undefined, { enabled: !!user && isOwner, refetchInterval: 15000 });
  const agents = (trpc.empireAgents as any).getEmpireAgents.useQuery(undefined, { enabled: !!user && isOwner, refetchInterval: 30000 });
  const runAgent = (trpc.challengeAutomation as any).runAgent.useMutation({
    onSuccess: (data: any) => {
      toast({ title: "Agent execution finished", description: data?.action || "Agent run persisted to telemetry." });
      status.refetch();
      agents.refetch();
    },
    onError: (err: any) => toast({ title: "Agent run failed", description: err.message, variant: "destructive" }),
  });
  const pauseAgent = (trpc.empireAgents as any).stopAgent.useMutation({
    onSuccess: () => { toast({ title: "Agent paused" }); agents.refetch(); status.refetch(); },
    onError: (err: any) => toast({ title: "Pause failed", description: err.message, variant: "destructive" }),
  });
  const resumeAgent = (trpc.empireAgents as any).resumeAgent.useMutation({
    onSuccess: () => { toast({ title: "Agent resumed" }); agents.refetch(); status.refetch(); },
    onError: (err: any) => toast({ title: "Resume failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div style={{ minHeight: "100vh", background: "#07070c", color: "white", display: "grid", placeItems: "center" }}>Verifying owner session…</div>;
  }

  if (!user || !isOwner) {
    return (
      <div style={{ minHeight: "100vh", background: "#07070c", color: "white", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 560, textAlign: "center", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 28 }}>
          <Shield size={36} color="#c9a84c" />
          <h1 style={{ margin: "16px 0 8px", fontSize: 30 }}>Owner-only live operations</h1>
          <p style={{ color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>This page controls real agents and revenue workflows. Sign in with an owner or admin account to continue.</p>
          <Link href="/login"><button style={{ marginTop: 18, padding: "12px 18px", borderRadius: 12, border: "none", background: "#c9a84c", color: "#050508", fontWeight: 800, cursor: "pointer" }}>Log in</button></Link>
        </div>
      </div>
    );
  }

  const live = status.data;
  const agentList = Array.isArray(agents.data) ? agents.data : [];
  const prioritized = agentList
    .slice()
    .sort((a: any, b: any) => Number(b.total_revenue_generated ?? 0) - Number(a.total_revenue_generated ?? 0))
    .slice(0, 49);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 18% 0%, rgba(201,168,76,0.16), transparent 34%), #07070c", color: "white", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <Link href="/king/engine"><button style={{ background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><ArrowLeft size={16} /> KingCam Engine</button></Link>
          <button onClick={() => { status.refetch(); agents.refetch(); }} style={{ background: "rgba(201,168,76,0.16)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.34)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 800 }}><RefreshCw size={16} /> Refresh</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.25fr .75fr", gap: 18, alignItems: "stretch", marginBottom: 18 }}>
          <div style={{ background: "rgba(0,0,0,0.34)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 26, padding: 26, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(201,168,76,0.10), transparent 55%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#c9a84c", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 900, marginBottom: 12 }}><Activity size={14} /> Agent Live Operations</div>
              <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(36px, 7vw, 68px)", lineHeight: 0.95, margin: "0 0 14px" }}>49-agent money loop command center.</h1>
              <p style={{ color: "rgba(255,255,255,0.64)", maxWidth: 720, lineHeight: 1.65, fontSize: 16 }}>This is the owner-only bridge between KingCam Engine, Empire Agents, Telegram drops, Stripe/VaultX checkout surfaces, challenge progress, and real telemetry. Run, pause, resume, and verify the system from one page.</p>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 26, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><Target color="#c9a84c" /><strong>Active Challenge</strong></div>
            <div style={{ fontSize: 42, fontWeight: 950, color: "#c9a84c" }}>{money(live?.challenge?.currentRevenue)}</div>
            <div style={{ color: "rgba(255,255,255,0.52)", marginBottom: 14 }}>of {money(live?.challenge?.targetRevenue ?? 5000)} target · {pct(live?.challenge?.progressPct)} complete</div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${Math.min(100, Number(live?.challenge?.progressPct ?? 0))}%`, height: "100%", background: "linear-gradient(90deg,#c9a84c,#38bdf8)", borderRadius: 999 }} /></div>
            <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.46)" }}>Projected target date: {live?.revenueLoop?.projectedTargetDate ? new Date(live.revenueLoop.projectedTargetDate).toLocaleDateString() : "waiting on verified revenue velocity"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 22 }}>
          <StatCard label="Active Agents" value={String(live?.agents?.active ?? 0)} sub={`${live?.agents?.total ?? 0} total agents`} tone="#38bdf8" />
          <StatCard label="Priced Agents" value={String(live?.agents?.priced ?? 0)} sub="for-sale or base priced" />
          <StatCard label="7-Day Verified Revenue" value={money(live?.revenueLoop?.revenue7d)} sub={`${live?.revenueLoop?.transactionCount7d ?? 0} challenge transactions`} tone="#4ade80" />
          <StatCard label="Agent Lifetime Revenue" value={money(live?.agents?.lifetimeRevenue)} sub="from empire_agents" tone="#fb923c" />
        </div>

        {live?.error ? <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f97316", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.22)", borderRadius: 14, padding: 14, marginBottom: 18 }}><AlertTriangle size={18} /> Live DB status query returned: {live.error}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18 }}>
          <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 22, overflow: "hidden" }}>
            <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}><Bot color="#c9a84c" /><strong>Agent inventory and controls</strong></div>
            <div style={{ maxHeight: 620, overflow: "auto" }}>
              {prioritized.map((agent: any) => {
                const active = String(agent.status).toLowerCase() === "active";
                const price = Number(agent.base_price_cents ?? 0) / 100;
                return (
                  <div key={agent.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, padding: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong>{agent.name}</strong>
                        <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: active ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.08)", color: active ? "#4ade80" : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{agent.status}</span>
                        {price > 0 ? <span style={{ fontSize: 10, color: "#c9a84c" }}>{money(price)} priced</span> : null}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.46)", marginTop: 6 }}>{agent.slug} · {agent.entity_name || "No entity"} · revenue {money(agent.total_revenue_generated)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button onClick={() => runAgent.mutate({ agentSlug: agent.slug })} disabled={runAgent.isPending} style={{ padding: "9px 11px", borderRadius: 10, border: "none", background: "#c9a84c", color: "#050508", fontWeight: 900, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}><Zap size={14} /> RUN NOW</button>
                      {active ? (
                        <button onClick={() => pauseAgent.mutate({ agentId: Number(agent.id), reason: "Paused from Agent Live" })} style={{ padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "white", cursor: "pointer" }}><Pause size={14} /></button>
                      ) : (
                        <button onClick={() => resumeAgent.mutate({ agentId: Number(agent.id), reason: "Resumed from Agent Live" })} style={{ padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(74,222,128,0.28)", background: "rgba(74,222,128,0.1)", color: "#4ade80", cursor: "pointer" }}><Play size={14} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 22, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><DollarSign color="#4ade80" /><strong>Six-step revenue loop</strong></div>
              {(live?.revenueLoop?.sixStepPath || []).map((step: string, i: number) => <div key={step} style={{ display: "flex", gap: 10, marginBottom: 10, color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.45 }}><span style={{ color: "#c9a84c", fontWeight: 900 }}>{i + 1}</span><span>{step}</span></div>)}
            </div>
            <div style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 22, padding: 18 }}>
              <strong>Latest agent reports</strong>
              {(live?.recentReports || []).map((r: any, i: number) => <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 12, color: "rgba(255,255,255,0.55)" }}><div style={{ color: "white", fontWeight: 800 }}>{r.agent_name || r.agent_slug}</div><div>{r.report_type} · {money(r.revenue_impact)}</div></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
