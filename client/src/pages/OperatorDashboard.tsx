import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle,
  Clock,
  Pause,
  Play,
  Radar,
  RefreshCcw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const T = {
  bg: "#050506",
  panel: "rgba(16,16,20,0.86)",
  panel2: "rgba(25,19,28,0.92)",
  border: "rgba(255,255,255,0.10)",
  gold: "#d7b35a",
  pink: "#ff4fa3",
  purple: "#8b5cf6",
  cyan: "#67e8f9",
  text: "#fff7ed",
  muted: "#a8a29e",
  danger: "#fb7185",
  success: "#34d399",
  warning: "#fbbf24",
};

type AnyRecord = Record<string, any>;

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
        backdropFilter: "blur(18px)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function StatusPill({ tone, children }: { tone: "safe" | "live" | "warn" | "idle"; children: React.ReactNode }) {
  const color = tone === "safe" ? T.success : tone === "live" ? T.pink : tone === "warn" ? T.warning : T.muted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color,
        border: `1px solid ${color}55`,
        background: `${color}18`,
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function Metric({ label, value, accent, icon }: { label: string; value: React.ReactNode; accent: string; icon: React.ReactNode }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800 }}>{label}</div>
          <div style={{ color: accent, fontSize: 28, fontWeight: 950, marginTop: 5 }}>{value}</div>
        </div>
        <div style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}3d`, borderRadius: 16, padding: 12 }}>{icon}</div>
      </div>
    </Card>
  );
}

function timeAgo(value?: string | Date | null) {
  if (!value) return "not recorded";
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return String(value);
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function OperatorDashboard() {
  const [patrolMode, setPatrolMode] = useState<"test" | "manual">("test");
  const configQuery = trpc.vaultxAcquisition.getConfig.useQuery(undefined, { retry: false });
  const boardQuery = trpc.vaultxAcquisition.getBoard.useQuery({ limit: 120 }, { retry: false, refetchInterval: 30000 });
  const proofQuery = trpc.vaultxAcquisition.getProof.useQuery({ limit: 80 }, { retry: false, refetchInterval: 30000 });
  const scheduledQuery = trpc.scheduler.getScheduledPosts.useQuery({}, { retry: false, refetchInterval: 45000 });

  const bootstrap = trpc.vaultxAcquisition.bootstrap.useMutation({
    onSuccess: () => {
      configQuery.refetch();
      boardQuery.refetch();
      proofQuery.refetch();
    },
  });
  const runNow = trpc.vaultxAcquisition.runNow.useMutation({
    onSuccess: () => {
      boardQuery.refetch();
      proofQuery.refetch();
    },
  });
  const startCron = trpc.vaultxAcquisition.startCron.useMutation({ onSuccess: () => configQuery.refetch() });
  const stopCron = trpc.vaultxAcquisition.stopCron.useMutation({ onSuccess: () => configQuery.refetch() });

  const board = (boardQuery.data ?? {}) as AnyRecord;
  const proof = (proofQuery.data ?? {}) as AnyRecord;
  const config = ((configQuery.data as AnyRecord | undefined)?.config ?? {}) as AnyRecord;
  const scheduledPosts = ((scheduledQuery.data ?? []) as AnyRecord[]).slice(0, 10);
  const leads = (board.leads ?? board.pipeline ?? []) as AnyRecord[];
  const actions = (board.actions ?? board.outreachQueue ?? board.pendingActions ?? []) as AnyRecord[];
  const handoffs = (board.handoffs ?? board.hotHandoffs ?? []) as AnyRecord[];
  const events = (proof.events ?? proof.executions ?? proof.items ?? proof.logs ?? []) as AnyRecord[];
  const summary = (proof.summary ?? {}) as AnyRecord;

  const readiness = useMemo(() => {
    const checks = [
      { label: "Acquisition schema and API", ok: !configQuery.error, detail: configQuery.error?.message || "Operator config endpoint responding" },
      { label: "Roaming board", ok: !boardQuery.error, detail: boardQuery.error?.message || `${leads.length} lead signal${leads.length === 1 ? "" : "s"} visible` },
      { label: "Execution proof ledger", ok: !proofQuery.error, detail: proofQuery.error?.message || `${events.length} proof event${events.length === 1 ? "" : "s"} visible` },
      { label: "Release scheduler", ok: !scheduledQuery.error, detail: scheduledQuery.error?.message || `${scheduledPosts.length} scheduled release${scheduledPosts.length === 1 ? "" : "s"} visible` },
      { label: "Live-send restraint", ok: config.liveSendsEnabled !== true && config.enabled !== true, detail: "Default posture keeps autonomous sends gated until explicitly approved" },
    ];
    return checks;
  }, [configQuery.error, boardQuery.error, proofQuery.error, scheduledQuery.error, leads.length, events.length, scheduledPosts.length, config.liveSendsEnabled, config.enabled]);

  const readyCount = readiness.filter((item) => item.ok).length;
  const isBusy = bootstrap.isPending || runNow.isPending || startCron.isPending || stopCron.isPending;
  const lastRun = summary.lastRunAt || summary.last_run_at || events[0]?.createdAt || events[0]?.created_at;

  return (
    <div style={{ minHeight: "100vh", color: T.text, background: `radial-gradient(circle at 15% 12%, rgba(255,79,163,0.24), transparent 30%), radial-gradient(circle at 85% 0%, rgba(139,92,246,0.24), transparent 34%), linear-gradient(135deg, #050506 0%, #100912 52%, #050506 100%)`, padding: "28px 20px 56px" }}>
      <div style={{ maxWidth: 1380, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 22 }}>
          <div style={{ maxWidth: 830 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <StatusPill tone="safe"><ShieldCheck size={13} /> Approval-gated autonomy</StatusPill>
              <StatusPill tone={config.enabled ? "live" : "idle"}><Radar size={13} /> {config.enabled ? "Cron armed" : "Cron parked"}</StatusPill>
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(34px, 6vw, 74px)", lineHeight: 0.92, letterSpacing: "-0.06em", fontWeight: 950 }}>
              Clone Roaming Command Center
            </h1>
            <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.7, maxWidth: 760, marginTop: 16 }}>
              This is the cockpit for the clone to roam like an operator: discover creator opportunities, score intent, queue outreach, surface human handoffs, and keep content releases visible. It is built to feel powerful without turning into uncontrolled live sending; dry-runs, proof logs, and approval gates stay first-class.
            </p>
          </div>
          <Card style={{ minWidth: 300, background: "linear-gradient(135deg, rgba(255,79,163,0.14), rgba(139,92,246,0.12))" }}>
            <div style={{ color: T.gold, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900 }}>Roam readiness</div>
            <div style={{ fontSize: 44, fontWeight: 950, marginTop: 8 }}>{readyCount}/{readiness.length}</div>
            <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.55 }}>Subsystems online enough for safe patrol and operator review. Live release/outreach still requires explicit approval controls.</div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
          <Metric label="Lead signals" value={summary.leads ?? leads.length} accent={T.cyan} icon={<Users size={22} />} />
          <Metric label="Queued actions" value={summary.actions ?? actions.length} accent={T.pink} icon={<Zap size={22} />} />
          <Metric label="Human handoffs" value={summary.handoffs ?? handoffs.length} accent={T.warning} icon={<Rocket size={22} />} />
          <Metric label="Proof events" value={summary.events ?? events.length} accent={T.success} icon={<Activity size={22} />} />
          <Metric label="Scheduled drops" value={scheduledPosts.length} accent={T.gold} icon={<CalendarDays size={22} />} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)", gap: 18, alignItems: "stretch" }}>
          <Card style={{ background: "linear-gradient(145deg, rgba(12,12,17,0.94), rgba(34,18,35,0.76))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.03em" }}>Safe patrol controls</h2>
                <p style={{ margin: "8px 0 0", color: T.muted, lineHeight: 1.6, maxWidth: 720 }}>
                  Run the clone in **test patrol** to verify discovery, scoring, copy, handoffs, and release readiness without live sends. Manual mode is still approval-aware and remains subordinate to backend safety gates.
                </p>
              </div>
              <button
                onClick={() => {
                  configQuery.refetch();
                  boardQuery.refetch();
                  proofQuery.refetch();
                  scheduledQuery.refetch();
                }}
                style={{ background: "rgba(255,255,255,0.06)", color: T.text, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px", height: 42, cursor: "pointer", fontWeight: 800 }}
              >
                <RefreshCcw size={14} style={{ verticalAlign: "middle", marginRight: 8 }} /> Refresh
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              {["test", "manual"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPatrolMode(mode as "test" | "manual")}
                  style={{
                    background: patrolMode === mode ? T.gold : "rgba(255,255,255,0.05)",
                    color: patrolMode === mode ? "#130b05" : T.text,
                    border: `1px solid ${patrolMode === mode ? T.gold : T.border}`,
                    borderRadius: 999,
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {mode === "test" ? "Test patrol dry-run" : "Manual gated patrol"}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <button
                disabled={isBusy}
                onClick={() => bootstrap.mutate()}
                style={{ background: "rgba(103,232,249,0.13)", color: T.cyan, border: `1px solid ${T.cyan}55`, borderRadius: 16, padding: 16, cursor: "pointer", fontWeight: 900, textAlign: "left" }}
              >
                <ShieldCheck size={18} />
                <div style={{ marginTop: 8 }}>Bootstrap schema</div>
                <small style={{ color: T.muted }}>Prepare DB-backed operator tables.</small>
              </button>
              <button
                disabled={isBusy}
                onClick={() => runNow.mutate({ mode: patrolMode, sourceLimit: 25, outreachLimit: 15, followUpLimit: 15 })}
                style={{ background: "linear-gradient(135deg, rgba(255,79,163,0.24), rgba(139,92,246,0.22))", color: T.text, border: `1px solid rgba(255,79,163,0.45)`, borderRadius: 16, padding: 16, cursor: "pointer", fontWeight: 900, textAlign: "left" }}
              >
                <Play size={18} />
                <div style={{ marginTop: 8 }}>Run patrol now</div>
                <small style={{ color: T.muted }}>Execute a proof-backed roam cycle.</small>
              </button>
              <button
                disabled={isBusy}
                onClick={() => startCron.mutate()}
                style={{ background: "rgba(52,211,153,0.12)", color: T.success, border: `1px solid ${T.success}55`, borderRadius: 16, padding: 16, cursor: "pointer", fontWeight: 900, textAlign: "left" }}
              >
                <Radar size={18} />
                <div style={{ marginTop: 8 }}>Arm acquisition loop</div>
                <small style={{ color: T.muted }}>Starts gated discovery/outreach cron.</small>
              </button>
              <button
                disabled={isBusy}
                onClick={() => stopCron.mutate()}
                style={{ background: "rgba(251,113,133,0.12)", color: T.danger, border: `1px solid ${T.danger}55`, borderRadius: 16, padding: 16, cursor: "pointer", fontWeight: 900, textAlign: "left" }}
              >
                <Pause size={18} />
                <div style={{ marginTop: 8 }}>Park roaming loop</div>
                <small style={{ color: T.muted }}>Stops autonomous acquisition cron.</small>
              </button>
            </div>

            {(runNow.error || bootstrap.error || startCron.error || stopCron.error) && (
              <div style={{ marginTop: 16, border: `1px solid ${T.danger}55`, background: "rgba(251,113,133,0.11)", color: T.text, borderRadius: 16, padding: 14 }}>
                <AlertTriangle size={16} style={{ color: T.danger, verticalAlign: "middle", marginRight: 8 }} />
                {(runNow.error || bootstrap.error || startCron.error || stopCron.error)?.message}
              </div>
            )}
            {runNow.data && (
              <pre style={{ marginTop: 16, maxHeight: 220, overflow: "auto", background: "rgba(0,0,0,0.34)", border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, color: T.cyan, fontSize: 12, lineHeight: 1.5 }}>
                {JSON.stringify(runNow.data, null, 2)}
              </pre>
            )}
          </Card>

          <Card>
            <h2 style={{ margin: 0, fontSize: 21 }}>Roaming readiness checks</h2>
            <p style={{ color: T.muted, lineHeight: 1.55, fontSize: 13 }}>The clone should only feel alive when there is proof, telemetry, and brakes. These checks keep growth aggressive and controlled.</p>
            <div style={{ display: "grid", gap: 10 }}>
              {readiness.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 10, border: `1px solid ${item.ok ? "rgba(52,211,153,0.24)" : "rgba(251,113,133,0.35)"}`, background: item.ok ? "rgba(52,211,153,0.08)" : "rgba(251,113,133,0.08)", borderRadius: 16, padding: 12 }}>
                  {item.ok ? <CheckCircle size={17} color={T.success} /> : <AlertTriangle size={17} color={T.danger} />}
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>{item.label}</div>
                    <div style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, border: `1px solid rgba(215,179,90,0.35)`, background: "rgba(215,179,90,0.09)", borderRadius: 16, padding: 13, color: T.muted, fontSize: 12, lineHeight: 1.55 }}>
              <Sparkles size={15} color={T.gold} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Last proof signal: <strong style={{ color: T.gold }}>{timeAgo(lastRun)}</strong>. If this is stale, run a test patrol first before arming any continuous loop.
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 18, marginTop: 18 }}>
          <Card>
            <h2 style={{ margin: 0, fontSize: 20 }}><Bot size={18} color={T.pink} style={{ verticalAlign: "middle", marginRight: 8 }} /> Roaming lead board</h2>
            <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.55 }}>Creators, prospects, and market signals the clone is evaluating.</p>
            <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto" }}>
              {leads.slice(0, 12).map((lead, index) => (
                <div key={lead.id ?? `${lead.platform}-${lead.handle}-${index}`} style={{ border: `1px solid ${T.border}`, borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.035)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{lead.displayName || lead.display_name || lead.handle || "Unnamed signal"}</strong>
                    <span style={{ color: T.cyan, fontWeight: 900 }}>{lead.intentScore ?? lead.intent_score ?? lead.score ?? "--"}</span>
                  </div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>{lead.platform || "platform"} {lead.handle ? `· @${lead.handle}` : ""}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>{String(lead.niche || lead.vertical || lead.recentActivity || lead.recent_activity || "Awaiting next patrol signal").slice(0, 160)}</div>
                </div>
              ))}
              {leads.length === 0 && <div style={{ color: T.muted, padding: 18, textAlign: "center" }}>No lead signals are visible yet. Bootstrap, then run a test patrol.</div>}
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: 0, fontSize: 20 }}><Zap size={18} color={T.gold} style={{ verticalAlign: "middle", marginRight: 8 }} /> Action and handoff queue</h2>
            <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.55 }}>What the clone wants to do next, including hot leads that need a human decision.</p>
            <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto" }}>
              {[...handoffs.slice(0, 6), ...actions.slice(0, 8)].slice(0, 12).map((item, index) => (
                <div key={item.id ?? index} style={{ border: `1px solid ${index < handoffs.length ? "rgba(251,191,36,0.32)" : T.border}`, borderRadius: 16, padding: 12, background: index < handoffs.length ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.035)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{item.actionType || item.action_type || item.type || item.status || "Queued operator action"}</strong>
                    <span style={{ color: index < handoffs.length ? T.warning : T.muted, fontSize: 11, fontWeight: 900 }}>{timeAgo(item.createdAt || item.created_at || item.updatedAt || item.updated_at)}</span>
                  </div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>{String(item.message || item.reason || item.notes || item.summary || item.nextStep || item.next_step || "Waiting for proof-backed patrol output").slice(0, 180)}</div>
                </div>
              ))}
              {handoffs.length + actions.length === 0 && <div style={{ color: T.muted, padding: 18, textAlign: "center" }}>No queued actions or handoffs are visible yet.</div>}
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: 0, fontSize: 20 }}><CalendarDays size={18} color={T.cyan} style={{ verticalAlign: "middle", marginRight: 8 }} /> Release runway</h2>
            <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.55 }}>Scheduled content the platform can release through the existing scheduler once approvals and platform credentials are ready.</p>
            <div style={{ display: "grid", gap: 10, maxHeight: 420, overflow: "auto" }}>
              {scheduledPosts.map((post) => (
                <div key={post.id} style={{ border: `1px solid ${T.border}`, borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.035)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{post.contentType || post.content_type || "content"}</strong>
                    <span style={{ color: post.status === "scheduled" ? T.success : T.muted, fontSize: 11, fontWeight: 900 }}>{post.status}</span>
                  </div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 5 }}>{String(post.caption || "No caption").slice(0, 150)}</div>
                  <div style={{ color: T.gold, fontSize: 12, marginTop: 6 }}><Clock size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />{post.scheduledFor || post.scheduled_for ? new Date(post.scheduledFor || post.scheduled_for).toLocaleString() : "No scheduled time"}</div>
                </div>
              ))}
              {scheduledPosts.length === 0 && <div style={{ color: T.muted, padding: 18, textAlign: "center" }}>No scheduled releases returned for this account yet. The scheduler API is present; the clone release queue needs approved media assets and schedule jobs.</div>}
            </div>
          </Card>
        </div>

        <Card style={{ marginTop: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Execution proof stream</h2>
          <p style={{ color: T.muted, lineHeight: 1.55, fontSize: 13 }}>Every patrol, queue decision, and safe-send block should leave evidence. This stream is the audit trail that prevents invisible automation.</p>
          <div style={{ display: "grid", gap: 9, maxHeight: 360, overflow: "auto" }}>
            {events.slice(0, 24).map((event, index) => (
              <div key={event.id ?? index} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 12, border: `1px solid ${T.border}`, borderRadius: 14, padding: 11, background: "rgba(0,0,0,0.18)" }}>
                <div style={{ color: T.gold, fontSize: 12, fontWeight: 900 }}>{timeAgo(event.createdAt || event.created_at || event.timestamp)}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{event.eventType || event.event_type || event.type || event.status || "operator proof"}</div>
                  <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>{String(event.message || event.details || event.outcome || event.metadata ? JSON.stringify(event.message || event.details || event.outcome || event.metadata) : "Proof event recorded").slice(0, 260)}</div>
                </div>
              </div>
            ))}
            {events.length === 0 && <div style={{ color: T.muted, textAlign: "center", padding: 20 }}>No execution proof returned yet. Run a test patrol to generate the first verified roam record.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default OperatorDashboard;
