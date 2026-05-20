/**
 * ============================================================================
 * OWNER COCKPIT — EMPIRE MISSION CONTROL V2
 * ============================================================================
 * The nerve center of the CreatorVault empire.
 * Design: Cinematic dark, #0a0a0a / #141414, gold accents, Playfair Display.
 * Features: System health grid, bot status, revenue challenge banner,
 *           platform map, quick-launch to all owner tools.
 * ============================================================================
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Crown, Activity, Bot, Database, Zap, TrendingUp,
  Shield, Radio, Radar, Target, DollarSign, Users,
  ChevronRight, ExternalLink, CheckCircle2, AlertTriangle,
  XCircle, Clock, BarChart3, Globe, Lock, Unlock,
  Flame, Star, Eye, Settings, Terminal, Layers,
  ArrowUpRight, Cpu, Server, Wifi, WifiOff,
} from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        "#0a0a0a",
  surface:   "#141414",
  surfaceHi: "#1a1a1a",
  border:    "rgba(255,255,255,0.06)",
  borderHi:  "rgba(201,168,76,0.3)",
  gold:      "#c9a84c",
  goldDim:   "rgba(201,168,76,0.12)",
  goldGlow:  "rgba(201,168,76,0.2)",
  text:      "#f5f0e8",
  muted:     "#666",
  mutedHi:   "#888",
  green:     "#10B981",
  red:       "#ef4444",
  blue:      "#3b82f6",
  purple:    "#8b5cf6",
  cyan:      "#06b6d4",
};

// ─── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: "online" | "warning" | "offline" | "unknown" }) {
  const colors = { online: C.green, warning: C.gold, offline: C.red, unknown: C.muted };
  const c = colors[status];
  return (
    <span style={{
      display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
      background: c, boxShadow: status === "online" ? `0 0 8px ${c}` : "none",
      animation: status === "online" ? "pulse 2s infinite" : "none",
      flexShrink: 0,
    }} />
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string;
  color?: string; icon: any; trend?: "up" | "down" | "flat";
}) {
  const c = color || C.gold;
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: "12px", padding: "20px",
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: c + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} style={{ color: c }} />
          </div>
          <span style={{ fontSize: "10px", color: C.muted, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</span>
        </div>
        {trend && (
          <ArrowUpRight size={14} style={{ color: trend === "up" ? C.green : trend === "down" ? C.red : C.muted, transform: trend === "down" ? "rotate(90deg)" : "none" }} />
        )}
      </div>
      <div style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 900, color: C.text, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "12px", color: C.mutedHi }}>{sub}</div>}
    </div>
  );
}

// ─── Section Card (navigation tile) ──────────────────────────────────────────
function SectionCard({ label, desc, href, color, icon: Icon, badge }: {
  label: string; desc: string; href: string;
  color: string; icon: any; badge?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [, setLocation] = useLocation();
  return (
    <div
      onClick={() => setLocation(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.surfaceHi : C.surface,
        border: `1px solid ${hovered ? color + "44" : C.border}`,
        borderRadius: "12px", padding: "20px",
        cursor: "pointer", transition: "all 0.2s ease",
        display: "flex", flexDirection: "column", gap: "12px",
        boxShadow: hovered ? `0 0 30px ${color}15` : "none",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {badge && (
            <span style={{ fontSize: "9px", color, background: color + "15", border: `1px solid ${color}33`, borderRadius: "20px", padding: "2px 8px", fontWeight: 800, letterSpacing: "0.1em" }}>
              {badge}
            </span>
          )}
          <ChevronRight size={14} style={{ color: hovered ? color : C.muted, transition: "color 0.2s" }} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: C.text, marginBottom: "4px" }}>{label}</div>
        <div style={{ fontSize: "12px", color: C.muted, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── Bot Status Row ───────────────────────────────────────────────────────────
function BotRow({ bot }: { bot: any }) {
  const status = bot.status === "active" ? "online" : bot.status === "error" ? "offline" : "warning";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "12px 16px",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <StatusDot status={status} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{bot.name || bot.username || bot.id}</div>
        <div style={{ fontSize: "11px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{bot.type || "telegram"}</div>
      </div>
      <span style={{
        fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
        color: status === "online" ? C.green : status === "offline" ? C.red : C.gold,
        background: (status === "online" ? C.green : status === "offline" ? C.red : C.gold) + "15",
        border: `1px solid ${(status === "online" ? C.green : status === "offline" ? C.red : C.gold)}33`,
        borderRadius: "20px", padding: "2px 8px", textTransform: "uppercase",
      }}>
        {bot.status || "active"}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OwnerCockpit() {
  const [activeTab, setActiveTab] = useState<"command" | "systems" | "bots" | "platform" | "api">("command");
  const [tick, setTick] = useState(0);

  const { data: stats }     = trpc.ownerControl.getStats.useQuery();
  const { data: dbHealth }  = trpc.ownerControl.getDatabaseHealth.useQuery();
  const { data: bots }      = trpc.ownerControl.getBots.useQuery();
  const { data: governance }= trpc.ownerControl.getRoleGovernance.useQuery();
  const { data: challenge } = trpc.empireAgents.getActiveChallenge.useQuery();

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const challengePct = challenge
    ? Math.min(100, Math.round((parseFloat(challenge.current_revenue || 0) / parseFloat(challenge.target_revenue || 5000)) * 100))
    : 0;
  const challengeCurrent = challenge ? parseFloat(challenge.current_revenue || 0) : 0;
  const challengeTarget  = challenge ? parseFloat(challenge.target_revenue || 5000) : 5000;

  const TABS = [
    { id: "command",  label: "Command",  icon: Crosshair2 },
    { id: "systems",  label: "Systems",  icon: Server     },
    { id: "bots",     label: "Bots",     icon: Bot        },
    { id: "platform", label: "Platform", icon: Layers     },
    { id: "api",      label: "API Map",  icon: Terminal   },
  ] as const;

  // All platform sections for navigation
  const EMPIRE_SECTIONS = [
    { label: "Chicas Empire",        desc: "Dominican creator network — recruitment, management, revenue", href: "/owner-cockpit/chicas-empire",        color: "#ec4899", icon: Star,      badge: "LIVE" },
    { label: "Presentation Empire",  desc: "Pitch decks, investor materials, empire storytelling",         href: "/owner-cockpit/presentation-empire",  color: C.gold,   icon: BarChart3, badge: "LIVE" },
    { label: "Recruitment HQ",       desc: "Creator acquisition pipeline — leads, outreach, onboarding",   href: "/owner-cockpit/recruitment",          color: C.blue,   icon: Users,     badge: "LIVE" },
    { label: "Espionage Dashboard",  desc: "Competitor intel, market surveillance, trend radar",            href: "/owner-cockpit/espionage",            color: C.purple, icon: Radar,     badge: "LIVE" },
    { label: "AI Empire",            desc: "Autonomous agent fleet — status, ROI, task queues",            href: "/owner-cockpit/ai-empire",            color: C.cyan,   icon: Cpu,       badge: "LIVE" },
    { label: "Apple Queue",          desc: "iOS app review pipeline and App Store management",              href: "/owner-cockpit/apple-queue",          color: "#f97316", icon: Globe,    badge: "LIVE" },
  ];

  const OWNER_TOOLS = [
    { label: "Empire Challenge",     desc: "Revenue war room — challenge progress, transaction log",        href: "/king/money-mission",                 color: C.gold,   icon: Target    },
    { label: "KingCam Clone Lab",    desc: "AI clone generation — Kling 2.6 model",                        href: "/kingcam-clone",                      color: C.purple, icon: Zap       },
    { label: "Hollywood Studio",     desc: "Full episode production — 7-stage pipeline",                   href: "/hollywood-studio",                   color: "#ef4444", icon: Flame     },
    { label: "Video Lab",            desc: "Pollo AI video generation — 4 Crush recipes",                  href: "/video-lab",                          color: C.blue,   icon: Activity  },
    { label: "DayShift Doctor",      desc: "Club/dancer management — In-Club Studio OS",                   href: "/dayshift-doctor",                    color: "#ec4899", icon: Shield    },
    { label: "Apparel Lab",          desc: "Fashion CAD — 12 modes, fabric physics, cost engine",          href: "/apparel-lab",                        color: C.cyan,   icon: Layers    },
    { label: "Funnel Forge",         desc: "5-step AI sales funnel builder",                               href: "/funnel-forge",                       color: C.green,  icon: TrendingUp },
    { label: "Social Factory",       desc: "1 video → 30-day content calendar",                            href: "/social-factory",                     color: "#f97316", icon: Radio     },
    { label: "Telegram Money Hub",   desc: "Bot monetization — broadcasts, subscriptions",                 href: "/telegram-money-hub",                 color: "#25D366", icon: DollarSign },
    { label: "KingCam Showcase",     desc: "Public showcase page for KingCam brand",                       href: "/kingcam-showcase",                   color: C.gold,   icon: Crown     },
    { label: "Agent Roster",         desc: "All AI agents — status, capabilities, ROI",                    href: "/agents",                             color: C.purple, icon: Bot       },
    { label: "Ops Status",           desc: "Platform health, PM2, build info",                             href: "/ops-status",                         color: C.muted,  icon: Server    },
  ];

  // API routers list (condensed)
  const API_ROUTERS = [
    { key: "empireAgents",    label: "Empire Agents",    category: "Revenue",  status: "Live" },
    { key: "ownerControl",    label: "Owner Control",    category: "Owner",    status: "Live" },
    { key: "marketplace",     label: "Marketplace",      category: "Commerce", status: "Live" },
    { key: "audio",           label: "Audio Pipeline",   category: "Media",    status: "Live" },
    { key: "dayshiftV2",      label: "DayShift V2",      category: "Ops",      status: "Live" },
    { key: "apparel",         label: "Apparel Lab",      category: "Design",   status: "Live" },
    { key: "hollywoodProd",   label: "Hollywood",        category: "Video",    status: "Live" },
    { key: "funnel",          label: "Funnel Forge",     category: "Sales",    status: "Live" },
    { key: "cloneEmpire",     label: "Clone Empire",     category: "AI",       status: "Live" },
    { key: "viralMechanics",  label: "Viral Mechanics",  category: "Growth",   status: "Live" },
    { key: "commandHub",      label: "Command Hub",      category: "Owner",    status: "Live" },
    { key: "telegramMoney",   label: "Telegram Money",   category: "Revenue",  status: "Live" },
    { key: "podcastStudio",   label: "Podcast Studio",   category: "Media",    status: "Live" },
    { key: "imageGen",        label: "Image Gen",        category: "AI",       status: "Live" },
    { key: "devguardian",     label: "DevGuardian",      category: "DevOps",   status: "Live" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top ambient line ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "1px",
        background: `linear-gradient(90deg, transparent 0%, ${C.gold}66 30%, ${C.gold}cc 50%, ${C.gold}66 70%, transparent 100%)`,
        zIndex: 20,
      }} />

      {/* ── Header ── */}
      <div style={{
        padding: "28px 24px 0",
        background: `linear-gradient(180deg, ${C.surfaceHi} 0%, transparent 100%)`,
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.green, boxShadow: `0 0 10px ${C.green}`, animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: "10px", color: C.gold, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  Mission Control — Online
                </span>
                <span style={{ fontSize: "10px", color: C.muted, fontFamily: "monospace" }}>{timeStr}</span>
              </div>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 700,
                color: C.text, lineHeight: 1.1, margin: 0,
              }}>
                Owner Cockpit
              </h1>
              <p style={{ color: C.muted, fontSize: "13px", marginTop: "6px", margin: "6px 0 0" }}>
                CreatorVault Empire — Full system visibility and control
              </p>
            </div>

            {/* Challenge banner */}
            {challenge && (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.gold}33`,
                borderRadius: "12px", padding: "14px 20px",
                display: "flex", alignItems: "center", gap: "16px",
                minWidth: "260px",
                boxShadow: `0 0 30px ${C.goldGlow}`,
                cursor: "pointer",
              }}
              onClick={() => window.location.href = "/king/money-mission"}>
                <div>
                  <div style={{ fontSize: "10px", color: C.gold, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                    Active Challenge
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: C.text }}>{challenge.title}</div>
                  <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                    ${challengeCurrent.toLocaleString()} / ${challengeTarget.toLocaleString()}
                  </div>
                </div>
                <div style={{ position: "relative", width: "48px", height: "48px", flexShrink: 0 }}>
                  <svg width="48" height="48" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke={C.gold} strokeWidth="4"
                      strokeDasharray={`${(challengePct / 100) * 125.6} 125.6`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: C.gold }}>
                    {challengePct}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            {[
              { id: "command",  label: "Command",  icon: Crown    },
              { id: "systems",  label: "Systems",  icon: Server   },
              { id: "bots",     label: "Bots",     icon: Bot      },
              { id: "platform", label: "Platform", icon: Layers   },
              { id: "api",      label: "API Map",  icon: Terminal },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                style={{
                  padding: "8px 16px",
                  background: "transparent", border: "none",
                  borderBottom: activeTab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
                  color: activeTab === t.id ? C.gold : C.muted,
                  cursor: "pointer", fontSize: "12px", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.2s ease", marginBottom: "-1px",
                }}>
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── COMMAND TAB ── */}
        {activeTab === "command" && (
          <div>
            {/* Top metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "32px" }}>
              <MetricCard label="Total Users"    value={governance?.total || "—"}                    sub="registered accounts"    icon={Users}     color={C.blue}   />
              <MetricCard label="Creators"       value={governance?.byRole?.creator || "—"}          sub="active creators"        icon={Star}      color={C.gold}   />
              <MetricCard label="Active Bots"    value={stats?.bots?.active || "—"}                  sub={`of ${stats?.bots?.total || 0} total`} icon={Bot} color={C.green} trend="up" />
              <MetricCard label="Deployments"    value={stats?.deployments?.active || "—"}           sub="services running"       icon={Server}    color={C.cyan}   />
              <MetricCard label="DB Health"      value={dbHealth?.status === "healthy" ? "OK" : "!"} sub={`${(dbHealth as any)?.tables?.users || 0} users`} icon={Database} color={dbHealth?.status === "healthy" ? C.green : C.red} />
            </div>

            {/* Empire sections */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "10px", color: C.muted, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Crown size={12} style={{ color: C.gold }} />
                Empire Command Centers
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                {EMPIRE_SECTIONS.map(s => <SectionCard key={s.href} {...s} />)}
              </div>
            </div>

            {/* Owner tools */}
            <div>
              <div style={{ fontSize: "10px", color: C.muted, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={12} style={{ color: C.gold }} />
                Owner Tools & Weapons
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                {OWNER_TOOLS.map(t => <SectionCard key={t.href} {...t} />)}
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEMS TAB ── */}
        {activeTab === "systems" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {/* Deployments */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: C.cyan + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Server size={18} style={{ color: C.cyan }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.text }}>Deployments</div>
                    <div style={{ fontSize: "11px", color: C.muted }}>{stats?.deployments?.total || 0} total services</div>
                  </div>
                </div>
                {[
                  { label: "Active",  value: stats?.deployments?.active || 0,  color: C.green },
                  { label: "Paused",  value: stats?.deployments?.paused || 0,  color: C.gold  },
                  { label: "Error",   value: stats?.deployments?.error || 0,   color: C.red   },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StatusDot status={row.label === "Active" ? "online" : row.label === "Error" ? "offline" : "warning"} />
                      <span style={{ fontSize: "13px", color: C.mutedHi }}>{row.label}</span>
                    </div>
                    <span style={{ fontSize: "18px", fontWeight: 900, color: row.color, fontFamily: "'Playfair Display', serif" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Database */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: (dbHealth?.status === "healthy" ? C.green : C.red) + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Database size={18} style={{ color: dbHealth?.status === "healthy" ? C.green : C.red }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.text }}>Database</div>
                    <div style={{ fontSize: "11px", color: dbHealth?.status === "healthy" ? C.green : C.red, fontWeight: 600 }}>
                      {dbHealth?.status || "checking..."}
                    </div>
                  </div>
                </div>
                {(dbHealth as any)?.tables && Object.entries((dbHealth as any).tables).map(([table, count]) => (
                  <div key={table} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: "13px", color: C.mutedHi, fontFamily: "monospace" }}>{table}</span>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>{count as number}</span>
                  </div>
                ))}
              </div>

              {/* User governance */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: C.blue + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users size={18} style={{ color: C.blue }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.text }}>Role Governance</div>
                    <div style={{ fontSize: "11px", color: C.muted }}>{governance?.total || 0} total accounts</div>
                  </div>
                </div>
                {governance?.byRole && Object.entries(governance.byRole).map(([role, count]) => (
                  <div key={role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: "13px", color: C.mutedHi, textTransform: "capitalize" }}>{role}</span>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>{count as number}</span>
                  </div>
                ))}
              </div>

              {/* Bot type breakdown */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: C.purple + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={18} style={{ color: C.purple }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: C.text }}>Bot Fleet</div>
                    <div style={{ fontSize: "11px", color: C.muted }}>{stats?.bots?.total || 0} bots deployed</div>
                  </div>
                </div>
                {stats?.bots?.byType && Object.entries(stats.bots.byType).map(([type, count]) => (
                  <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: "13px", color: C.mutedHi, textTransform: "capitalize" }}>{type.replace("_", " ")}</span>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BOTS TAB ── */}
        {activeTab === "bots" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", color: C.muted, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
                <Bot size={12} style={{ color: C.gold }} />
                Bot Fleet — {bots?.length || 0} bots
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: C.green, background: C.green + "15", border: `1px solid ${C.green}33`, borderRadius: "20px", padding: "3px 10px", fontWeight: 700 }}>
                  {stats?.bots?.active || 0} active
                </span>
                <span style={{ fontSize: "11px", color: C.red, background: C.red + "15", border: `1px solid ${C.red}33`, borderRadius: "20px", padding: "3px 10px", fontWeight: 700 }}>
                  {stats?.bots?.error || 0} errors
                </span>
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
              {bots && bots.length > 0 ? (
                bots.map((bot: any) => <BotRow key={bot.id} bot={bot} />)
              ) : (
                <div style={{ padding: "60px 20px", textAlign: "center" }}>
                  <Bot size={40} style={{ color: "#222", margin: "0 auto 12px", display: "block" }} />
                  <div style={{ color: C.muted, fontSize: "14px" }}>No bots registered</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PLATFORM TAB ── */}
        {activeTab === "platform" && (
          <div>
            <div style={{ fontSize: "10px", color: C.muted, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Globe size={12} style={{ color: C.gold }} />
              Full Platform Map — All Routes
            </div>
            {/* Quick links grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
              {[
                { path: "/",                   label: "Home",                  category: "Core"    },
                { path: "/dashboard",          label: "Dashboard",             category: "Core"    },
                { path: "/creator",            label: "Creator Home",          category: "Core"    },
                { path: "/video-lab",          label: "Video Lab",             category: "Video"   },
                { path: "/hollywood-studio",   label: "Hollywood Studio",      category: "Video"   },
                { path: "/apparel-lab",        label: "Apparel Lab",           category: "Design"  },
                { path: "/funnel-forge",       label: "Funnel Forge",          category: "Sales"   },
                { path: "/social-factory",     label: "Social Factory",        category: "Growth"  },
                { path: "/dayshift-doctor",    label: "DayShift Doctor",       category: "Ops"     },
                { path: "/kingcam-clone",      label: "KingCam Clone",         category: "AI"      },
                { path: "/vaultx",             label: "VaultX",                category: "VaultX"  },
                { path: "/vault-x/editor",label: "VaultX Editor",   category: "VaultX"  },
                { path: "/telegram-money-hub", label: "Telegram Money Hub",    category: "Revenue" },
                { path: "/podcast-studio",     label: "Podcast Studio",        category: "Media"   },
                { path: "/image-lab",          label: "Image Lab",             category: "Design"  },
                { path: "/music-cover-studio", label: "Music Cover Studio",    category: "Music"   },
                { path: "/agents",             label: "Agent Roster",          category: "AI"      },
                { path: "/ops-status",         label: "Ops Status",            category: "DevOps"  },
                { path: "/king/empire",        label: "Empire Command",        category: "Owner"   },
                { path: "/king/analytics",     label: "King Analytics",        category: "Owner"   },
                { path: "/king/users",         label: "User Management",       category: "Owner"   },
                { path: "/king/waitlist",      label: "Waitlist Manager",      category: "Owner"   },
              ].map(route => {
                const catColors: Record<string, string> = {
                  Core: C.blue, Video: "#ef4444", Design: "#ec4899", Sales: C.gold,
                  Growth: C.green, Ops: C.purple, AI: C.cyan, VaultX: "#dc2626",
                  Revenue: C.gold, Media: "#f97316", Music: "#8b5cf6", DevOps: C.muted,
                  Owner: C.gold,
                };
                const c = catColors[route.category] || C.muted;
                return (
                  <a key={route.path} href={route.path}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px",
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: "8px", textDecoration: "none",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c + "44"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{route.label}</div>
                      <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>{route.path}</div>
                    </div>
                    <span style={{ fontSize: "9px", color: c, background: c + "15", border: `1px solid ${c}33`, borderRadius: "20px", padding: "2px 6px", fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {route.category}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* ── API MAP TAB ── */}
        {activeTab === "api" && (
          <div>
            <div style={{ fontSize: "10px", color: C.muted, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Terminal size={12} style={{ color: C.gold }} />
              tRPC Router Map — {API_ROUTERS.length} routers
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px 80px", gap: "0", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surfaceHi }}>
                {["Category", "Router", "Namespace", "Status"].map(h => (
                  <div key={h} style={{ fontSize: "10px", color: C.muted, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>{h}</div>
                ))}
              </div>
              {API_ROUTERS.map((r, i) => (
                <div key={r.key} style={{
                  display: "grid", gridTemplateColumns: "120px 1fr 100px 80px", gap: "0",
                  padding: "14px 16px",
                  borderBottom: i < API_ROUTERS.length - 1 ? `1px solid ${C.border}` : "none",
                  alignItems: "center",
                }}>
                  <div style={{ fontSize: "11px", color: C.muted }}>{r.category}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{r.label}</div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", color: C.blue }}>{r.key}</div>
                  <div>
                    <span style={{ fontSize: "10px", color: C.green, background: C.green + "15", border: `1px solid ${C.green}33`, borderRadius: "20px", padding: "2px 8px", fontWeight: 700 }}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// Workaround for JSX icon reference
function Crosshair2(props: any) { return <Target {...props} />; }
