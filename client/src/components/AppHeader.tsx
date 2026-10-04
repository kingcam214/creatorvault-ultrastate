import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowUpRight,
  Clapperboard,
  Crown,
  LayoutDashboard,
  Menu,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  CANONICAL_PRIMARY_NAV,
  CreatorVaultRoute,
} from "@/lib/productArchitecture";

export default function AppHeader() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOwnerOrAdmin = user?.role === "king" || user?.role === "admin";
  const isAuthPage = ["/login", "/register", "/signup"].some(
    path => location === path || location.startsWith(`${path}?`)
  );

  if (isAuthPage) return null;

  const close = () => setMobileOpen(false);
  const isActive = (href: string) =>
    location === href || location.startsWith(`${href}/`);

  return (
    <header className="cv-dna fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link asChild href="/">
          <a className="flex shrink-0 items-center gap-3" onClick={close}>
            <img
              src="/logo-white.png"
              alt="CreatorVault"
              className="h-8 w-auto"
            />
            <span className="heading-xs text-white">CreatorVault</span>
            <span className="cv-eyebrow eyebrow hidden border-l border-white/20 pl-3 text-white/45 sm:inline">
              Creator OS
            </span>
          </a>
        </Link>

        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="CreatorVault primary navigation"
        >
          {CANONICAL_PRIMARY_NAV.map(item => (
            <Link asChild key={item.href} href={item.href}>
              <a
                className={`heading-xs border-b-2 py-2 text-base transition ${isActive(item.href) ? "border-[#00D9FF] text-[#00D9FF]" : "border-transparent text-white/65 hover:border-white/35 hover:text-white"}`}
              >
                {item.label}
              </a>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link asChild href="/creator/video-studio">
                <a className="cv-ghost text-sm">
                  <Clapperboard className="h-3.5 w-3.5" /> Studio
                </a>
              </Link>
              <Link asChild href="/creator/workspace">
                <a className="cv-ghost text-sm">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Workspace
                </a>
              </Link>
              <Link asChild href={CreatorVaultRoute.creatorOS}>
                <a className="cv-cta-outline text-sm">My work</a>
              </Link>
              {isOwnerOrAdmin && (
                <Link asChild href="/king/content">
                  <a className="cv-cta-gold text-sm">
                    <Shield className="h-3.5 w-3.5" /> Owner controls
                  </a>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link asChild href="/login">
                <a className="cv-ghost text-sm">Sign in</a>
              </Link>
              <Link asChild href="/signup">
                <a className="cv-cta text-sm">
                  Join CreatorVault <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="cv-ghost grid h-10 w-10 place-items-center lg:hidden"
          aria-label={
            mobileOpen
              ? "Close CreatorVault navigation"
              : "Open CreatorVault navigation"
          }
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(open => !open)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#1A1A1A] px-4 py-5 lg:hidden">
          <nav
            className="mx-auto grid max-w-7xl gap-1"
            aria-label="CreatorVault mobile navigation"
          >
            {CANONICAL_PRIMARY_NAV.map((item, index) => (
              <Link asChild key={item.href} href={item.href}>
                <a
                  onClick={close}
                  className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-1 py-4 transition ${isActive(item.href) ? "border-[#00D9FF] text-[#00D9FF]" : "border-white/10 text-white hover:border-white/35"}`}
                >
                  <span className="badge-text text-white/35">0{index + 1}</span>
                  <span className="heading-xs text-lg">{item.label}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Link>
            ))}
            {user && (
              <>
                <Link asChild href="/creator/video-studio">
                  <a
                    onClick={close}
                    className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 px-1 py-4 text-white transition hover:border-[#00D9FF]"
                  >
                    <Clapperboard className="h-4 w-4 text-[#00D9FF]" />
                    <span className="heading-xs text-lg">Video Studio</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Link>
                <Link asChild href="/creator/workspace">
                  <a
                    onClick={close}
                    className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 px-1 py-4 text-white transition hover:border-[#00D9FF]"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#00D9FF]" />
                    <span className="heading-xs text-lg">Workspace</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Link>
              </>
            )}
            <div className="mt-5 grid gap-3">
              {user ? (
                <Link asChild href={CreatorVaultRoute.creatorOS}>
                  <a onClick={close} className="cv-cta w-full">
                    Open my Creator OS <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Link>
              ) : (
                <>
                  <Link asChild href="/login">
                    <a onClick={close} className="cv-cta-outline w-full">
                      Sign in
                    </a>
                  </Link>
                  <Link asChild href="/signup">
                    <a onClick={close} className="cv-cta w-full">
                      Join CreatorVault <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Link>
                </>
              )}
              {isOwnerOrAdmin && (
                <Link asChild href="/king/content">
                  <a onClick={close} className="cv-cta-gold w-full">
                    <Crown className="h-4 w-4" /> Owner controls
                  </a>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
