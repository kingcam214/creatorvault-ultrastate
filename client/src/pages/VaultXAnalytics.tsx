import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, Users, TrendingUp, TrendingDown, MessageSquare,
  Star, AlertTriangle, Clock, CheckCircle, Loader2, BarChart2,
  ShoppingBag, Eye, Heart, Zap, ArrowUpRight, ArrowDownRight,
  FileText, RefreshCcw,
} from "lucide-react";
import { VaultXLogo } from "@/components/vaultx/VaultXBrand";

// ============================================================================
// HELPERS
// ============================================================================
const fmt = (n: number | null | undefined, decimals = 0) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtUSD = (n: number | null | undefined) =>
  n == null ? "—" : `$${fmt(n, 2)}`;

const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${fmt(n, 1)}%`;

const CHART_COLORS = {
  purple:  "#8B5CF6",
  blue:    "#3B82F6",
  green:   "#10B981",
  amber:   "#F59E0B",
  red:     "#EF4444",
  pink:    "#EC4899",
  cyan:    "#06B6D4",
  indigo:  "#6366F1",
};

const PIE_COLORS = [CHART_COLORS.purple, CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.pink];

// ============================================================================
// STAT CARD
// ============================================================================
function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub?: string;
  icon: any; color: string; trend?: number;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
        {trend != null && (
          <span className="flex items-center gap-0.5 text-xs font-bold" style={{ color: trend >= 0 ? "#22C55E" : "#EF4444" }}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-xs font-bold mt-0.5" style={{ color: "#6B7280" }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: "#4B5563" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// SECTION WRAPPER
// ============================================================================
function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0F0F0F" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <h2 className="text-sm font-black text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================
function CustomTooltip({ active, payload, label, prefix = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      {label && <p className="text-[10px] font-bold mb-1" style={{ color: "#6B7280" }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-bold" style={{ color: p.color || "white" }}>
          {p.name}: {prefix}{typeof p.value === "number" ? fmt(p.value, 2) : p.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN ANALYTICS PAGE
// ============================================================================
export default function VaultXAnalytics() {
  const revenueQ = trpc.vaultx.getRevenueAnalytics.useQuery();
  const contentQ = trpc.vaultx.getContentAnalytics.useQuery();
  const fanQ     = trpc.vaultx.getFanAnalytics.useQuery();
  const requestsQ = trpc.vaultx.getCustomRequests.useQuery({ status: "all" });

  const [activeTab, setActiveTab] = useState<"overview" | "content" | "fans" | "requests">("overview");

  const isLoading = revenueQ.isLoading || contentQ.isLoading || fanQ.isLoading || requestsQ.isLoading;

  // ── Derived data ──────────────────────────────────────────────────────────
  const rev = revenueQ.data;
  const revMonthly: { month: string; subscription_revenue: number; ppv_revenue: number; tip_revenue: number; message_revenue: number; total_revenue: number }[] =
    (rev?.monthly ?? []) as any;
  const totalRevenue: number = revMonthly.reduce((s, m) => s + (m.total_revenue ?? 0), 0);
  const lastMonth = (revMonthly[revMonthly.length - 1] as any)?.total_revenue ?? 0;
  const prevMonth = (revMonthly[revMonthly.length - 2] as any)?.total_revenue ?? 0;
  const revenueGrowth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;
  const projectedNext = lastMonth * (1 + revenueGrowth / 100);

  const subsByTier: { tier: string; count: number }[] = fanQ.data?.subsByTier ?? [];
  const totalSubs = subsByTier.reduce((s, t) => s + (t.count ?? 0), 0);

  const topEarning: any[] = contentQ.data?.topEarning ?? [];
  const byType: any[] = contentQ.data?.byType ?? [];
  const conversionRate = topEarning.length > 0
    ? (topEarning.reduce((s, c) => s + (c.purchase_count ?? 0), 0) /
       Math.max(topEarning.reduce((s, c) => s + (c.view_count ?? 0), 0), 1)) * 100
    : 0;

  const topSpenders: any[] = fanQ.data?.topSpenders ?? [];
  const atRisk: any[] = fanQ.data?.atRisk ?? [];
  const avgLifetime = topSpenders.length > 0
    ? topSpenders.reduce((s, f) => s + (f.lifetime_value ?? 0), 0) / topSpenders.length
    : 0;

  const requests: any[] = requestsQ.data?.requests ?? [];
  const reqPending   = requests.filter(r => r.status === "pending").length;
  const reqAccepted  = requests.filter(r => r.status === "accepted").length;
  const reqCompleted = requests.filter(r => r.status === "completed").length;
  const reqRevenue   = requests.filter(r => r.status === "completed").reduce((s, r) => s + (r.price ?? 0), 0);

  // Message revenue from rev data
  const msgRevenue: number = (rev?.totals as any)?.total_messages ?? 0;
  const msgUnlockRate: number = 0;
  const aiVsHuman: { name: string; value: number }[] = [
    { name: "AI Chatter", value: 0 },
    { name: "Human",      value: msgRevenue },
  ];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000000" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: "#8B5CF6" }} />
          <p className="text-sm font-bold" style={{ color: "#6B7280" }}>Loading analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 relative" style={{ background: "#000000", fontFamily: "'Inter', sans-serif" }}>
      {/* Multi-layer ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.15) 0%, transparent 60%)" }} />
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 40% 30% at 80% 80%, rgba(236,72,153,0.06) 0%, transparent 60%)" }} />

      {/* ── HEADER — Command Center ── */}
      <div className="sticky top-0 z-30 px-6 py-4" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 30 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VaultXLogo size="sm" showTagline={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">Analytics</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.18)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.32)" }}>Revenue Command</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Track what sold, who paid, which fans are at risk, and what to ship next.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { revenueQ.refetch(); contentQ.refetch(); fanQ.refetch(); requestsQ.refetch(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.08)" }}>
              <RefreshCcw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto flex gap-1 mt-4">
          {([
            { id: "overview",  label: "Revenue & Subs",    icon: DollarSign },
            { id: "content",   label: "Content",           icon: BarChart2  },
            { id: "fans",      label: "Fan Intelligence",  icon: Users      },
            { id: "requests",  label: "Custom Requests",   icon: FileText   },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: activeTab === tab.id ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)", color: activeTab === tab.id ? "#8B5CF6" : "#6B7280", border: `1px solid ${activeTab === tab.id ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}` }}>
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — REVENUE OVERVIEW + SUBSCRIBER METRICS
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <>
            {/* ── SECTION 1: Revenue Overview ── */}
            <Section title="Revenue Overview" icon={DollarSign} color={CHART_COLORS.green}>
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard label="Total Revenue (12mo)" value={fmtUSD(totalRevenue)} icon={DollarSign} color={CHART_COLORS.green} />
                <StatCard label="Last Month" value={fmtUSD(lastMonth)} sub="vs prior month" icon={TrendingUp} color={CHART_COLORS.blue} trend={revenueGrowth} />
                <StatCard label="MoM Growth" value={fmtPct(revenueGrowth)} icon={TrendingUp} color={revenueGrowth >= 0 ? CHART_COLORS.green : CHART_COLORS.red} />
                <StatCard label="Projected Next Month" value={fmtUSD(projectedNext)} sub="based on trend" icon={Zap} color={CHART_COLORS.amber} />
              </div>

              {/* Area chart */}
              {revMonthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revMonthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tipsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.amber} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.amber} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip content={<CustomTooltip prefix="$" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
                    <Area type="monotone" dataKey="total_revenue" name="Revenue" stroke={CHART_COLORS.green} fill="url(#revGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="subscription_revenue" name="Subs $" stroke={CHART_COLORS.purple} fill="url(#subGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="tip_revenue" name="Tips $" stroke={CHART_COLORS.amber} fill="url(#tipsGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <BarChart2 size={28} style={{ color: "#1F2937" }} />
                  <p className="text-sm" style={{ color: "#374151" }}>No revenue data yet — revenue will appear here as subscribers and purchases come in</p>
                </div>
              )}
            </Section>

            {/* ── SECTION 2: Subscriber Metrics ── */}
            <Section title="Subscriber Metrics" icon={Users} color={CHART_COLORS.purple}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <StatCard label="Active Subscribers" value={fmt(totalSubs)} icon={Users} color={CHART_COLORS.purple} />
                <StatCard label="Avg Lifetime Value" value={fmtUSD(avgLifetime)} sub="top 20 spenders" icon={Star} color={CHART_COLORS.amber} />
                <StatCard label="At-Risk Fans" value={fmt(atRisk.length)} sub="no activity 14+ days" icon={AlertTriangle} color={CHART_COLORS.red} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subs by tier bar chart */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Subscribers by Tier</p>
                  {subsByTier.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={subsByTier} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="tier" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Subscribers" radius={[6, 6, 0, 0]}>
                          {subsByTier.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-40" style={{ color: "#374151" }}>
                      <p className="text-sm">No subscriber data yet</p>
                    </div>
                  )}
                </div>

                {/* Tier distribution pie */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Tier Distribution</p>
                  {subsByTier.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={subsByTier} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={80} label={({ tier, percent }) => `${tier} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {subsByTier.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-40" style={{ color: "#374151" }}>
                      <p className="text-sm">No tier data yet</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* ── SECTION 4: Message Revenue ── */}
            <Section title="Message Revenue" icon={MessageSquare} color={CHART_COLORS.pink}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <StatCard label="Total Message Revenue" value={fmtUSD(msgRevenue)} icon={MessageSquare} color={CHART_COLORS.pink} />
                <StatCard label="Unlock Rate" value={fmtPct(msgUnlockRate)} sub="locked messages opened" icon={Eye} color={CHART_COLORS.cyan} />
                <StatCard label="AI vs Human Split" value={`${fmtUSD(aiVsHuman[0].value)} AI`} sub={`${fmtUSD(aiVsHuman[1].value)} human`} icon={Zap} color={CHART_COLORS.indigo} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>AI vs Human Revenue</p>
                  {(aiVsHuman[0].value > 0 || aiVsHuman[1].value > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={aiVsHuman} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {aiVsHuman.map((_, i) => <Cell key={i} fill={[CHART_COLORS.indigo, CHART_COLORS.pink][i]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip prefix="$" />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-40" style={{ color: "#374151" }}>
                      <p className="text-sm">No message revenue yet — send locked messages to fans to generate revenue</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Monthly Message Revenue</p>
                  {revMonthly.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={revMonthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="month" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                        <Tooltip content={<CustomTooltip prefix="$" />} />
                        <Bar dataKey="ppv" name="PPV Revenue" fill={CHART_COLORS.pink} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-40" style={{ color: "#374151" }}>
                      <p className="text-sm">No PPV data yet</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — CONTENT PERFORMANCE
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "content" && (
          <Section title="Content Performance" icon={BarChart2} color={CHART_COLORS.blue}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total Content Pieces" value={fmt(topEarning.length + (contentQ.data?.topViewed?.length ?? 0))} icon={Eye} color={CHART_COLORS.blue} />
              <StatCard label="Top Earner Revenue" value={fmtUSD(topEarning[0]?.revenue_generated)} sub={topEarning[0]?.title ?? "—"} icon={DollarSign} color={CHART_COLORS.green} />
              <StatCard label="Avg Conversion Rate" value={`${conversionRate.toFixed(1)}%`} sub="views → purchases" icon={TrendingUp} color={CHART_COLORS.amber} />
              <StatCard label="Content Types" value={fmt(byType.length)} sub="active categories" icon={ShoppingBag} color={CHART_COLORS.purple} />
            </div>

            {/* Top 10 earning — horizontal bar */}
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Top 10 Earning Content</p>
              {topEarning.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topEarning} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="title" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                    <Tooltip content={<CustomTooltip prefix="$" />} />
                    <Bar dataKey="revenue_generated" name="Revenue" radius={[0, 6, 6, 0]}>
                      {topEarning.map((_: any, i: number) => (
                        <Cell key={i} fill={`${CHART_COLORS.blue}${Math.round(255 - i * 18).toString(16).padStart(2, "0")}`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <BarChart2 size={28} style={{ color: "#1F2937" }} />
                  <p className="text-sm" style={{ color: "#374151" }}>No content revenue yet — upload and sell content to see performance data</p>
                </div>
              )}
            </div>

            {/* By type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Revenue by Content Type</p>
                {byType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byType} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="content_type" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<CustomTooltip prefix="$" />} />
                      <Bar dataKey="total_revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                        {byType.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40" style={{ color: "#374151" }}>
                    <p className="text-sm">No type data yet</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Views by Content Type</p>
                {byType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={byType} dataKey="total_views" nameKey="content_type" cx="50%" cy="50%" outerRadius={80} label={({ content_type, percent }) => `${content_type} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {byType.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40" style={{ color: "#374151" }}>
                    <p className="text-sm">No view data yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Content table */}
            {topEarning.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Content Performance Table</p>
                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Title", "Type", "Tier", "Views", "Purchases", "Revenue", "Conversion"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-black uppercase tracking-widest" style={{ color: "#4B5563" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topEarning.map((c: any, i: number) => {
                        const conv = c.view_count > 0 ? ((c.purchase_count / c.view_count) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                            <td className="px-3 py-2.5 font-bold text-white max-w-[180px] truncate">{c.title}</td>
                            <td className="px-3 py-2.5" style={{ color: "#6B7280" }}>{c.content_type}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold capitalize" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>{c.access_tier}</span>
                            </td>
                            <td className="px-3 py-2.5" style={{ color: "#9CA3AF" }}>{fmt(c.view_count)}</td>
                            <td className="px-3 py-2.5" style={{ color: "#9CA3AF" }}>{fmt(c.purchase_count)}</td>
                            <td className="px-3 py-2.5 font-bold" style={{ color: "#10B981" }}>{fmtUSD(c.revenue_generated)}</td>
                            <td className="px-3 py-2.5" style={{ color: parseFloat(conv) >= 5 ? "#22C55E" : "#6B7280" }}>{conv}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — FAN INTELLIGENCE
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "fans" && (
          <Section title="Fan Intelligence" icon={Users} color={CHART_COLORS.cyan}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total Active Fans" value={fmt(totalSubs)} icon={Users} color={CHART_COLORS.cyan} />
              <StatCard label="Avg Lifetime Value" value={fmtUSD(avgLifetime)} sub="top 20 spenders" icon={Star} color={CHART_COLORS.amber} />
              <StatCard label="At-Risk Fans" value={fmt(atRisk.length)} sub="silent 14+ days" icon={AlertTriangle} color={CHART_COLORS.red} />
              <StatCard label="Top Spender LTV" value={fmtUSD(topSpenders[0]?.lifetime_value)} sub={topSpenders[0]?.name ?? topSpenders[0]?.username ?? "—"} icon={Heart} color={CHART_COLORS.pink} />
            </div>

            {/* Top 20 spenders table */}
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Top 20 Spenders</p>
              {topSpenders.length > 0 ? (
                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["#", "Fan", "Tier", "Sub $", "Tips $", "PPV $", "Lifetime Value"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-black uppercase tracking-widest" style={{ color: "#4B5563" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topSpenders.map((fan: any, i: number) => (
                        <tr key={fan.fan_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                          <td className="px-3 py-2.5 font-black" style={{ color: i < 3 ? CHART_COLORS.amber : "#4B5563" }}>#{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <div>
                              <p className="font-bold text-white">{fan.name || fan.username || `Fan #${fan.fan_id}`}</p>
                              {fan.username && fan.name && <p className="text-[9px]" style={{ color: "#4B5563" }}>@{fan.username}</p>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold capitalize" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>{fan.tier}</span>
                          </td>
                          <td className="px-3 py-2.5" style={{ color: "#9CA3AF" }}>{fmtUSD(fan.sub_paid)}</td>
                          <td className="px-3 py-2.5" style={{ color: "#9CA3AF" }}>{fmtUSD(fan.tips_total)}</td>
                          <td className="px-3 py-2.5" style={{ color: "#9CA3AF" }}>{fmtUSD(fan.ppv_total)}</td>
                          <td className="px-3 py-2.5 font-black" style={{ color: "#10B981" }}>{fmtUSD(fan.lifetime_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <Users size={28} style={{ color: "#1F2937" }} />
                  <p className="text-sm" style={{ color: "#374151" }}>No subscriber data yet — fans will appear here once they subscribe</p>
                </div>
              )}
            </div>

            {/* At-risk fans */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>At-Risk Fans — No Activity in 14+ Days</p>
              {atRisk.length > 0 ? (
                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Fan", "Tier", "Subscribed", "Last Message", "Action"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-black uppercase tracking-widest" style={{ color: "#4B5563" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {atRisk.map((fan: any, i: number) => (
                        <tr key={fan.fan_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                          <td className="px-3 py-2.5 font-bold text-white">{fan.name || fan.username || `Fan #${fan.fan_id}`}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold capitalize" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>{fan.tier}</span>
                          </td>
                          <td className="px-3 py-2.5" style={{ color: "#6B7280" }}>{fan.created_at ? new Date(fan.created_at).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-2.5" style={{ color: "#6B7280" }}>{fan.last_message_at ? new Date(fan.last_message_at).toLocaleDateString() : "Never"}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>Re-engage</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 gap-2">
                  <CheckCircle size={24} style={{ color: "#22C55E" }} />
                  <p className="text-sm" style={{ color: "#374151" }}>All fans are active — no one at risk of churning</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4 — CUSTOM REQUESTS PIPELINE
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "requests" && (
          <Section title="Custom Requests Pipeline" icon={FileText} color={CHART_COLORS.amber}>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Pending" value={fmt(reqPending)} sub="awaiting response" icon={Clock} color={CHART_COLORS.amber} />
              <StatCard label="Accepted" value={fmt(reqAccepted)} sub="in progress" icon={CheckCircle} color={CHART_COLORS.blue} />
              <StatCard label="Completed" value={fmt(reqCompleted)} sub="fulfilled" icon={CheckCircle} color={CHART_COLORS.green} />
              <StatCard label="Pipeline Revenue" value={fmtUSD(reqRevenue)} sub="completed requests" icon={DollarSign} color={CHART_COLORS.green} />
            </div>

            {/* Status bar chart */}
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>Pipeline Status</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[
                  { status: "Pending",   count: reqPending,   fill: CHART_COLORS.amber },
                  { status: "Accepted",  count: reqAccepted,  fill: CHART_COLORS.blue  },
                  { status: "Completed", count: reqCompleted, fill: CHART_COLORS.green },
                  { status: "Declined",  count: requests.filter(r => r.status === "declined").length, fill: CHART_COLORS.red },
                ]} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="status" tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4B5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
                    {[CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.red].map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Requests table */}
            {requests.length > 0 ? (
              <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Fan", "Description", "Price", "Status", "Submitted", "Deadline"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-black uppercase tracking-widest" style={{ color: "#4B5563" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 50).map((req: any, i: number) => {
                      const statusColor = req.status === "completed" ? "#22C55E" : req.status === "accepted" ? "#3B82F6" : req.status === "pending" ? "#F59E0B" : "#EF4444";
                      return (
                        <tr key={req.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                          <td className="px-3 py-2.5 font-bold text-white">{req.fan_name || req.fan_username || `Fan #${req.fan_id}`}</td>
                          <td className="px-3 py-2.5 max-w-[220px]" style={{ color: "#9CA3AF" }}>
                            <p className="truncate">{req.description}</p>
                          </td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: "#10B981" }}>{fmtUSD(req.price)}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize" style={{ background: `${statusColor}18`, color: statusColor }}>{req.status}</span>
                          </td>
                          <td className="px-3 py-2.5" style={{ color: "#6B7280" }}>{req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-2.5" style={{ color: req.deadline && new Date(req.deadline) < new Date() ? "#EF4444" : "#6B7280" }}>
                            {req.deadline ? new Date(req.deadline).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <FileText size={28} style={{ color: "#1F2937" }} />
                <p className="text-sm" style={{ color: "#374151" }}>No custom requests yet — fans can submit requests from your profile page</p>
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
