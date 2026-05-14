/**
 * AppHeader.tsx — Global Navigation Shell
 * Dual-mode aware: VaultX Adult Mode 🔞 | General Creator Mode ✅
 * Mode badge is ALWAYS visible. Mode switcher accessible from header.
 */
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Menu, DollarSign, Users, BarChart3, Podcast, TrendingUp, Zap, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorMode, CreatorModeSwitcher } from "@/contexts/CreatorModeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Global Mode Badge ─────────────────────────────────────────────────────────
// Always visible. Clicking it opens the full mode switcher dropdown.
function GlobalModeBadge() {
  const { isAdult, mode, setMode, accentColor, modeBadge } = useCreatorMode();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-90 focus:outline-none"
          style={{
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}55`,
            color: accentColor,
            letterSpacing: "0.04em",
          }}
          title="Switch creator mode"
        >
          <span>{isAdult ? "🔞" : "✅"}</span>
          <span className="hidden sm:inline">{modeBadge}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 bg-slate-950 border-white/10 p-0 overflow-hidden"
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-white/10"
          style={{ background: `${accentColor}10` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
            Creator Mode
          </p>
          <p className="text-white text-sm font-semibold mt-0.5">
            {isAdult ? "VaultX Adult — Premium Creator Tools" : "General Creator — SFW Platform"}
          </p>
        </div>

        {/* Mode Options */}
        <div className="p-3 space-y-2">
          {/* Adult Mode */}
          <button
            onClick={() => setMode("adult")}
            className="w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left"
            style={{
              background: mode === "adult" ? "#a855f718" : "#ffffff08",
              border: mode === "adult" ? "1px solid #a855f755" : "1px solid #ffffff10",
            }}
          >
            <span className="text-xl mt-0.5">🔞</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: mode === "adult" ? "#a855f7" : "#e2e8f0" }}>
                VaultX Adult Mode
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                PPV, OnlyFans, Fansly, body-positive tools, desire-grade AI
              </p>
            </div>
            {mode === "adult" && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30 shrink-0">
                ACTIVE
              </span>
            )}
          </button>

          {/* SFW Mode */}
          <button
            onClick={() => setMode("sfw")}
            className="w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left"
            style={{
              background: mode === "sfw" ? "#3b82f618" : "#ffffff08",
              border: mode === "sfw" ? "1px solid #3b82f655" : "1px solid #ffffff10",
            }}
          >
            <span className="text-xl mt-0.5">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: mode === "sfw" ? "#3b82f6" : "#e2e8f0" }}>
                General Creator Mode
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                YouTube, TikTok, Instagram, brand deals, viral growth
              </p>
            </div>
            {mode === "sfw" && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-500/30 shrink-0">
                ACTIVE
              </span>
            )}
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/10">
          <p className="text-xs text-gray-600">
            Mode auto-detects from your creator profile. Manual override persists across sessions.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Mode-Aware Nav Label ──────────────────────────────────────────────────────
function ModeNavLabel({ adult, sfw }: { adult: string; sfw: string }) {
  const { isAdult } = useCreatorMode();
  return <>{isAdult ? adult : sfw}</>;
}

// ── AppHeader ─────────────────────────────────────────────────────────────────
export default function AppHeader() {
  const { user } = useAuth();
  const [location] = useLocation();
  const isOwnerOrAdmin = user?.role === "king" || user?.role === "admin";
  const { isAdult, accentColor } = useCreatorMode();

  // Hide header on auth pages
  const authPages = ["/login", "/register", "/signup"];
  if (authPages.some(p => location === p || location.startsWith(p + "?"))) {
    return null;
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b"
      style={{
        background: isAdult
          ? "rgba(10,5,20,0.92)"
          : "rgba(5,10,20,0.92)",
        borderColor: isAdult ? "#a855f722" : "#3b82f622",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center hover:opacity-80 transition-opacity shrink-0">
              <img
                src="/logo-white.png"
                alt="CreatorVault"
                className="h-10 w-auto"
              />
            </a>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {/* Creator Tools Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <ModeNavLabel adult="VaultX Tools" sfw="Creator Tools" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 bg-slate-900 border-white/10">
                  <DropdownMenuLabel
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: accentColor }}
                  >
                    {isAdult ? "💰 Monetization" : "💰 Money Making"}
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/creator-subscriptions">
                      <a className="w-full">{isAdult ? "Subscriptions — 70/30 Split" : "Subscriptions (70/30)"}</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/vaultlive">
                      <a className="w-full">{isAdult ? "VaultLive — 85/15 Split" : "VaultLive (85/15)"}</a>
                    </Link>
                  </DropdownMenuItem>
                  {isAdult && (
                    <DropdownMenuItem asChild>
                      <Link href="/vault-x/studio">
                        <a className="w-full flex items-center gap-2">
                          <Zap className="h-4 w-4" style={{ color: accentColor }} />
                          VaultX Studio
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/podcast-studio">
                      <a className="w-full flex items-center gap-2">
                        <Podcast className="h-4 w-4" />
                        Podcast Studio
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/creator-earnings">
                      <a className="w-full flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        My Earnings
                      </a>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: accentColor }}
                  >
                    {isAdult ? "🔥 Growth & Distribution" : "📈 Growth Tools"}
                  </DropdownMenuLabel>
                  {isAdult && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/vault-remix">
                          <a className="w-full flex items-center gap-2">
                            <Zap className="h-4 w-4" style={{ color: accentColor }} />
                            VaultRemix — Content Multiplier
                          </a>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/vaultx-challenges">
                          <a className="w-full">VaultX Revenue Loop</a>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/social-hub">
                      <a className="w-full">
                        {isAdult ? "Social Distribution Hub" : "Social Media Hub"}
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/social-audit">
                      <a className="w-full">Social Media Audit</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/performance-insights">
                      <a className="w-full flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Performance Insights
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/creator-toolbox">
                      <a className="w-full">
                        {isAdult ? "All VaultX Tools" : "Content Tools"}
                      </a>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Emma Network / Recruiter */}
            {user && (
              <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white">
                <Link href="/recruiter">
                  <Users className="h-4 w-4 mr-2" />
                  Emma Network
                </Link>
              </Button>
            )}

            {/* Admin Menu */}
            {isOwnerOrAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-purple-500/20">
                  <DropdownMenuLabel className="text-purple-400">Money Management</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/payouts">
                      <a className="w-full">Approve Payouts</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/manual-payments">
                      <a className="w-full">Confirm Payments</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-purple-400">System</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/owner-status">
                      <a className="w-full">Owner Status</a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/king">
                      <a className="w-full">King Dashboard</a>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Right Side: Mode Badge + Mobile Menu */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Global Mode Badge — always visible when logged in */}
            {user && <GlobalModeBadge />}

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-slate-900 border-white/10 max-h-[85vh] overflow-y-auto">
                {user && (
                  <>
                    {/* Mode indicator at top of mobile menu */}
                    <div
                      className="px-3 py-2 mx-2 mt-2 rounded-lg flex items-center gap-2"
                      style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
                    >
                      <span className="text-sm">{isAdult ? "🔞" : "✅"}</span>
                      <span className="text-xs font-bold" style={{ color: accentColor }}>
                        {isAdult ? "VaultX Adult Mode" : "General Creator Mode"}
                      </span>
                    </div>
                    <DropdownMenuSeparator className="bg-white/10 mt-2" />

                    <DropdownMenuLabel className="text-gray-400">
                      {isAdult ? "💰 Monetization" : "💰 Money Making"}
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/creator-subscriptions">
                        <a className="w-full">Subscriptions (70/30)</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/vaultlive">
                        <a className="w-full">VaultLive (85/15)</a>
                      </Link>
                    </DropdownMenuItem>
                    {isAdult && (
                      <DropdownMenuItem asChild>
                        <Link href="/vault-x/studio">
                          <a className="w-full" style={{ color: accentColor }}>VaultX Studio</a>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/podcast-studio">
                        <a className="w-full">Podcast Studio</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/creator-earnings">
                        <a className="w-full">My Earnings</a>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuLabel className="text-gray-400">
                      {isAdult ? "🔥 Growth & Distribution" : "📈 Growth Tools"}
                    </DropdownMenuLabel>
                    {isAdult && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/vault-remix">
                            <a className="w-full" style={{ color: accentColor }}>VaultRemix — Content Multiplier</a>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/vaultx-challenges">
                            <a className="w-full">VaultX Revenue Loop</a>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/social-hub">
                        <a className="w-full">{isAdult ? "Social Distribution Hub" : "Social Media Hub"}</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/social-audit">
                        <a className="w-full">Social Media Audit</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/performance-insights">
                        <a className="w-full">Performance Insights</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/creator-toolbox">
                        <a className="w-full">{isAdult ? "All VaultX Tools" : "Content Tools"}</a>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuLabel className="text-gray-400">Emma Network</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/recruiter">
                        <a className="w-full">Recruiter Dashboard</a>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                {isOwnerOrAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-purple-500/20" />
                    <DropdownMenuLabel className="text-purple-400">Admin</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/payouts">
                        <a className="w-full">Approve Payouts</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/manual-payments">
                        <a className="w-full">Confirm Payments</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/owner-status">
                        <a className="w-full">Owner Status</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/king">
                        <a className="w-full">King Dashboard</a>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
