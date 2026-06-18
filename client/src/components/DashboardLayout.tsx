/**
 * ============================================================================
 * CreatorVault Studio V2 — DashboardLayout
 * ============================================================================
 * The 5-Zone Navigation Shell:
 *   COMMAND | IDENTITY | EXECUTION | STUDIOS | INFRA
 *
 * Design DNA:
 *   - Deep charcoal / warm black base (#1A1A1A, #0A0A0A)
 *   - Bone/smoke surfaces (#F5F5F0, #E8E8E3)
 *   - ONE accent: aged gold (#C9A961)
 *   - Playfair Display for editorial titles
 *   - Inter for UI text
 *   - Apple-level restraint — one hero action per screen
 * ============================================================================
 */

import { useAuth } from "@/contexts/AuthContext";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import {
  Zap,
  Crown,
  DollarSign,
  Film,
  Settings,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Target,
  MessageSquare,
  ShoppingBag,
  BarChart3,
  Mic,
  GraduationCap,
  Video,
  Palette,
  Bot,
  Shield,
  GitBranch,
  Key,
  Activity,
  Globe,
  Church,
  Stethoscope,
  Store,
  Star,
  Briefcase,
  Building2,
  Brain,
  Tv,
  Monitor,
  PanelLeft,
  Shirt,
} from "lucide-react";

// ─── Zone Definitions ─────────────────────────────────────────────────────────

const ZONES = [
  { id: "command", label: "Launch", icon: Zap, path: "/king" },
  { id: "identity", label: "Brand", icon: Crown, path: "/king/identity" },
  { id: "execution", label: "Earn", icon: DollarSign, path: "/king/money-mission" },
  { id: "studios", label: "Create", icon: Film, path: "/king/presentation-builder" },
  { id: "infra", label: "Setup", icon: Settings, path: "/king/backoffice" },
] as const;

type ZoneId = typeof ZONES[number]["id"];

// ─── Zone Sub-Navigation ──────────────────────────────────────────────────────

const ZONE_NAV: Record<ZoneId, { label: string; path: string; icon: any }[]> = {
  command: [
    { label: "Today's Moves", path: "/king", icon: Zap },
    { label: "Growth Brain", path: "/empire-brain", icon: Brain },
    { label: "Launch Plan", path: "/king/launch-command", icon: Target },
    { label: "Analytics", path: "/king/analytics", icon: BarChart3 },
    { label: "Fans + Users", path: "/king/users", icon: Users },
  ],
  identity: [
    { label: "Creator Profile", path: "/king/identity", icon: Crown },
    { label: "Brand Kit", path: "/king/engine", icon: Palette },
    { label: "Scripts + Voice", path: "/king/script-writer", icon: Mic },
    { label: "Content Vault", path: "/king/backoffice", icon: Key },
    { label: "KingCam Demos", path: "/king/demos", icon: Star },
  ],
  execution: [
    { label: "Revenue Plan", path: "/king/money-mission", icon: DollarSign },
    { label: "Chicas Empire", path: "/owner-cockpit/chicas-empire", icon: Users },
    { label: "Offer Decks", path: "/owner-cockpit/presentation-empire", icon: Monitor },
    { label: "Creator Recruiting", path: "/owner-cockpit/recruitment", icon: Target },
    { label: "Marketplace", path: "/marketplace", icon: ShoppingBag },
    { label: "Subscriptions", path: "/subscriptions", icon: DollarSign },
  ],
  studios: [
    { label: "Build a Deck", path: "/king/presentation-builder", icon: Monitor },
    { label: "Automation Agents", path: "/emma-ai-agents", icon: Bot },
    { label: "Motion Flyer", path: "/animated-flyer-studio", icon: Film },
    { label: "Image Studio", path: "/image-lab", icon: Palette },
    { label: "VaultX Editor", path: "/vault-x/editor", icon: Video },
    { label: "VaultX Studio", path: "/vault-x/studio", icon: Video },
    { label: "Learn", path: "/university", icon: GraduationCap },
    { label: "Hollywood Studio", path: "/hollywood-studio", icon: Tv },
    { label: "Chuuch", path: "/chuuch/members", icon: Church },
    { label: "DayShift Doctor", path: "/dayshift-doctor", icon: Stethoscope },
    { label: "Apparel Lab", path: "/apparel-lab", icon: Shirt },
  ],
  infra: [
    { label: "Platform Setup", path: "/king/backoffice", icon: Settings },
    { label: "System Health", path: "/empire-state", icon: Activity },
    { label: "Agent Status", path: "/agent-tracker", icon: Bot },
    { label: "Rewards Center", path: "/king/gem-center", icon: Crown },
    { label: "VaultSpace", path: "/vaultspace-dashboard", icon: Globe },
    { label: "WhatsApp Bot", path: "/king/whatsapp-bot", icon: MessageSquare },
    { label: "Loyalty Tools", path: "/loyalty-command", icon: Shield },
  ],
};

// ─── Route → Zone Mapping ─────────────────────────────────────────────────────

function getActiveZone(path: string): ZoneId {
  if (
    path.startsWith("/king/money-mission") ||
    path.startsWith("/owner-cockpit/chicas") ||
    path.startsWith("/owner-cockpit/presentation") ||
    path.startsWith("/owner-cockpit/recruitment") ||
    path.startsWith("/marketplace") ||
    path.startsWith("/subscriptions") ||
    path.startsWith("/king/telegram")
  ) return "execution";

  if (
    path.startsWith("/king/presentation-builder") ||
    path.startsWith("/emma-ai-agents") ||
    path.startsWith("/animated-flyer") ||
    path.startsWith("/image-lab") ||
    path.startsWith("/vault-x/editor") || path.startsWith("/vault-x/studio") || path.startsWith("/vaultx/studio") || path.startsWith("/vaultx-studio") ||
    path.startsWith("/university") ||
    path.startsWith("/hollywood") ||
    path.startsWith("/chuuch") ||
    path.startsWith("/dayshift-doctor") ||
    path.startsWith("/vault-cut") ||
    path.startsWith("/music-cover")
  ) return "studios";

  if (
    path.startsWith("/king/backoffice") ||
    path.startsWith("/empire-state") ||
    path.startsWith("/agent-tracker") ||
    path.startsWith("/king/gem-center") ||
    path.startsWith("/vaultspace") ||
    path.startsWith("/king/whatsapp") ||
    path.startsWith("/loyalty-command")
  ) return "infra";

  if (
    path.startsWith("/king/identity") ||
    path.startsWith("/king/engine") ||
    path.startsWith("/king/script-writer") ||
    path.startsWith("/king/demos")
  ) return "identity";

  return "command";
}

// ─── Breadcrumb Generator ─────────────────────────────────────────────────────

function getBreadcrumb(path: string, zone: ZoneId): string[] {
  const zoneLabel = ZONES.find(z => z.id === zone)?.label ?? "Command";
  const subItem = ZONE_NAV[zone].find(item => item.path === path);
  if (!subItem || subItem.path === ZONES.find(z => z.id === zone)?.path) {
    return ["CreatorVault Studio", zoneLabel];
  }
  return ["CreatorVault Studio", zoneLabel, subItem.label];
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // @ts-ignore
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0A0A0A" }}>
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700, color: "#F5F5F0", letterSpacing: "-0.02em", textAlign: "center" }}>
            CreatorVault Studio
          </h1>
          <p style={{ color: "#666", fontSize: "14px", textAlign: "center", lineHeight: 1.6 }}>
            Access requires authentication.
          </p>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            style={{ background: "#C9A961", color: "#0A0A0A", fontWeight: 700, width: "100%", border: "none" }}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return <KingCamOSShell>{children}</KingCamOSShell>;
}

// ─── OS Shell ─────────────────────────────────────────────────────────────────

function KingCamOSShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const activeZone = getActiveZone(location);
  const breadcrumb = getBreadcrumb(location, activeZone);
  // @ts-ignore
  const { user, logout } = useAuth();

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);

    return () => {
      // no-op cleanup
    };
  }, [location]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: isMobile ? (mobileOpen ? "min(88vw, 340px)" : "0") : "280px",
          minWidth: isMobile ? (mobileOpen ? "min(88vw, 340px)" : "0") : "280px",
          background: "#111111",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          height: "100vh",
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: "#F5F5F0", letterSpacing: "-0.01em" }}>
            CreatorVault Studio
          </div>
          <div style={{ fontSize: "11px", color: "#C9A961", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "4px" }}>
            CreatorVault
          </div>
        </div>

        {/* Zone Tabs */}
        <div style={{ padding: "16px 12px 8px" }}>
          <div style={{ fontSize: "10px", color: "#444", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px", paddingLeft: "12px" }}>
            Zones
          </div>
          {ZONES.map(zone => {
            const isActive = activeZone === zone.id;
            return (
              <button
                key={zone.id}
                onClick={() => setLocation(zone.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: isMobile ? "13px 14px" : "10px 12px",
                  minHeight: isMobile ? "46px" : undefined,
                  borderRadius: "8px",
                  border: "none",
                  background: isActive ? "rgba(201,169,97,0.12)" : "transparent",
                  color: isActive ? "#C9A961" : "#666",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: "2px",
                  transition: "all 0.15s ease",
                }}
              >
                <zone.icon size={15} />
                {zone.label}
                {isActive && <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.6 }} />}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

        {/* Context-Aware Sub-Nav */}
        <div style={{ padding: "12px 12px 8px", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: "10px", color: "#444", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px", paddingLeft: "12px" }}>
            {ZONES.find(z => z.id === activeZone)?.label}
          </div>
          {ZONE_NAV[activeZone].map(item => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: isMobile ? "13px 14px" : "9px 12px",
                  minHeight: isMobile ? "46px" : undefined,
                  borderRadius: "6px",
                  border: "none",
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  color: isActive ? "#F5F5F0" : "#555",
                  fontSize: "13px",
                  fontWeight: isActive ? 500 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: "1px",
                  transition: "all 0.12s ease",
                }}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* User Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: "12px", color: "#F5F5F0", fontWeight: 600, marginBottom: "2px" }}>
            {user?.name ?? "KingCam"}
          </div>
          <div style={{ fontSize: "11px", color: "#444" }}>
            {user?.email ?? ""}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 49 }}
        />
      )}

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top Bar */}
        <header style={{
          height: isMobile ? "64px" : "56px",
          background: "#111111",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          padding: isMobile ? "0 14px" : "0 24px",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open creator navigation"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#F5F5F0", cursor: "pointer", padding: "10px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}

          {/* Breadcrumb */}
          <nav style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, overflow: "hidden" }}>
            {breadcrumb.map((crumb, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {i > 0 && <ChevronRight size={12} style={{ color: "#333", flexShrink: 0 }} />}
                <span style={{
                  fontSize: "12px",
                  color: i === breadcrumb.length - 1 ? "#F5F5F0" : "#444",
                  fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          {/* Zone Pills (desktop only) */}
          {!isMobile && (
            <div style={{ display: "flex", gap: "4px" }}>
              {ZONES.map(zone => {
                const isActive = activeZone === zone.id;
                return (
                  <button
                    key={zone.id}
                    onClick={() => setLocation(zone.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: isActive ? "1px solid rgba(201,169,97,0.4)" : "1px solid transparent",
                      background: isActive ? "rgba(201,169,97,0.1)" : "transparent",
                      color: isActive ? "#C9A961" : "#444",
                      fontSize: "11px",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <zone.icon size={11} />
                    {zone.label}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: isMobile ? "18px 14px 28px" : "32px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
