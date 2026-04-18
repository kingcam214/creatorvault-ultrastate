/**
 * ============================================================================
 * KingCam OS V2 — Command Zone (Daily Home)
 * ============================================================================
 * Route: /king
 * The single entry point. Daily orientation in 10 seconds.
 *
 * Sections:
 *   1. Greeting + Date
 *   2. Today's Priorities (AI-generated from Empire Brain)
 *   3. Revenue Snapshot (live from challenge tracker)
 *   4. Active Launches
 *   5. Critical Alerts (PM2, Stripe, WhatsApp)
 *   6. Quick Actions (6 max)
 * ============================================================================
 */

import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Zap,
  Target,
  MessageSquare,
  BarChart3,
  Key,
  Film,
  RefreshCw,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "10px",
      color: "#444",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      marginBottom: "16px",
      paddingBottom: "10px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {children}
    </div>
  );
}

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#111111",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Revenue Snapshot ─────────────────────────────────────────────────────────

function RevenueSnapshot() {
  const { data: challenge, isLoading } = trpc.empireAgents.getActiveChallenge.useQuery();

  const current = challenge ? parseFloat(challenge.current_revenue ?? "0") : 0;
  const target = challenge ? parseFloat(challenge.target_revenue ?? "5000") : 5000;
  const pct = Math.min((current / target) * 100, 100);
  const gap = Math.max(target - current, 0);

  return (
    <Section>
      <SectionLabel>Revenue Snapshot</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {[
          { label: "Week 1 Challenge", value: isLoading ? "—" : `$${current.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, accent: true },
          { label: "Target", value: isLoading ? "—" : `$${target.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, accent: false },
          { label: "Gap", value: isLoading ? "—" : `$${gap.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, accent: false },
          { label: "Progress", value: isLoading ? "—" : `${pct.toFixed(1)}%`, accent: false },
        ].map(stat => (
          <div key={stat.label}>
            <div style={{ fontSize: "11px", color: "#444", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
              {stat.label}
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "28px",
              fontWeight: 700,
              color: stat.accent ? "#C9A961" : "#F5F5F0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: pct > 0 ? "#C9A961" : "transparent",
          borderRadius: "2px",
          transition: "width 0.6s ease",
        }} />
      </div>
      {!isLoading && (
        <div style={{ fontSize: "11px", color: "#444", marginTop: "8px" }}>
          {challenge?.title ?? "Week 1 Challenge: First $5,000"} — {pct.toFixed(1)}% complete
        </div>
      )}
    </Section>
  );
}

// ─── Today's Priorities ───────────────────────────────────────────────────────

const PRIORITIES = [
  {
    id: 1,
    title: "Launch IGNITE Phase — Money Mission",
    context: "Drop the 4-piece trailer. Fire Telegram broadcast. DM 30 prospects with Creator Growth Agent offer.",
    cta: "Open Money Mission",
    path: "/king/money-mission",
    urgent: true,
  },
  {
    id: 2,
    title: "Verify WhatsApp Token",
    context: "Permanent Meta System User token must be set in .env to unlock automated outreach.",
    cta: "Open Back Office",
    path: "/king/backoffice",
    urgent: true,
  },
  {
    id: 3,
    title: "Review Presentation Empire Packages",
    context: "127 packages generated, 0 sold. Select top 5 and send to prospects manually.",
    cta: "Open Presentation Empire",
    path: "/owner-cockpit/presentation-empire",
    urgent: false,
  },
];

function TodaysPriorities() {
  const [, setLocation] = useLocation();
  return (
    <Section>
      <SectionLabel>Today's Priorities</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {PRIORITIES.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              padding: "16px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "8px",
              border: p.urgent ? "1px solid rgba(201,169,97,0.2)" : "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: p.urgent ? "rgba(201,169,97,0.15)" : "rgba(255,255,255,0.05)",
              color: p.urgent ? "#C9A961" : "#444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", color: "#F5F5F0", fontWeight: 600, marginBottom: "4px" }}>
                {p.title}
              </div>
              <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.5, marginBottom: "10px" }}>
                {p.context}
              </div>
              <button
                onClick={() => setLocation(p.path)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  color: "#C9A961",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  letterSpacing: "0.04em",
                }}
              >
                {p.cta} <ArrowRight size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Critical Alerts ──────────────────────────────────────────────────────────

function CriticalAlerts() {
  const [, setLocation] = useLocation();

  const ALERTS = [
    { id: "whatsapp", label: "WhatsApp permanent token not confirmed in .env", severity: "critical", path: "/king/backoffice" },
    { id: "challenge", label: "Week 1 Challenge at $0.00 — IGNITE phase not launched", severity: "critical", path: "/king/money-mission" },
    { id: "presentation", label: "127 Presentation Empire packages generated — 0 sent to prospects", severity: "warning", path: "/owner-cockpit/presentation-empire" },
  ];

  return (
    <Section>
      <SectionLabel>Critical Alerts</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {ALERTS.map(alert => (
          <div
            key={alert.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: alert.severity === "critical" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
              border: alert.severity === "critical" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(245,158,11,0.2)",
              cursor: "pointer",
            }}
            onClick={() => setLocation(alert.path)}
          >
            <AlertTriangle
              size={14}
              style={{ color: alert.severity === "critical" ? "#ef4444" : "#f59e0b", flexShrink: 0 }}
            />
            <span style={{ fontSize: "12px", color: "#aaa", flex: 1 }}>{alert.label}</span>
            <ArrowRight size={11} style={{ color: "#444", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Money Mission", path: "/king/money-mission", icon: DollarSign },
  { label: "Telegram Hub", path: "/king/telegram-hub", icon: MessageSquare },
  { label: "Presentation Builder", path: "/king/presentation-builder", icon: Film },
  { label: "Analytics", path: "/king/analytics", icon: BarChart3 },
  { label: "Vault", path: "/king/backoffice", icon: Key },
  { label: "Launch Command", path: "/king/launch-command", icon: Target },
];

function QuickActions() {
  const [, setLocation] = useLocation();
  return (
    <Section>
      <SectionLabel>Quick Actions</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.path}
            onClick={() => setLocation(action.path)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "8px",
              color: "#888",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.12s ease",
              textAlign: "left",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,169,97,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "#C9A961";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,169,97,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
              (e.currentTarget as HTMLButtonElement).style.color = "#888";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
            }}
          >
            <action.icon size={13} />
            {action.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function KingCommandZone() {
  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "42px",
          fontWeight: 700,
          color: "#F5F5F0",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: "6px",
        }}>
          {getGreeting()}, KingCam
        </h1>
        <p style={{ fontSize: "13px", color: "#444", fontWeight: 400 }}>
          {formatDate()}
        </p>
      </div>

      <RevenueSnapshot />
      <TodaysPriorities />
      <CriticalAlerts />
      <QuickActions />
    </div>
  );
}
