import type { ReactNode } from "react";
import { CheckCircle2, ChevronRight, Lock, PlayCircle } from "lucide-react";

export function VaultXLogo({ size = "md", stacked = false, showTagline = true }: { size?: "sm" | "md" | "lg"; stacked?: boolean; showTagline?: boolean }) {
  const vaultSize = size === "lg" ? "text-4xl sm:text-5xl" : size === "sm" ? "text-xl" : "text-2xl sm:text-3xl";
  const xSize = size === "lg" ? "text-7xl sm:text-8xl" : size === "sm" ? "text-4xl" : "text-5xl sm:text-6xl";

  return (
    <div className="inline-flex flex-col" aria-label="VaultX">
      <div className={`inline-flex ${stacked ? "flex-col items-start gap-0" : "items-center gap-1"}`}>
        <span
          className={`${vaultSize} font-black tracking-[-0.08em] leading-none text-white`}
          style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}
        >
          Vault
        </span>
        <span
          className={`${xSize} leading-none text-red-500 drop-shadow-[0_0_22px_rgba(239,68,68,.55)] -ml-1 sm:-ml-2 -rotate-6`}
          style={{
            fontFamily: "Brush Script MT, Segoe Script, Comic Sans MS, cursive",
            fontWeight: 900,
            WebkitTextStroke: "1px rgba(255,255,255,.10)",
          }}
        >
          X
        </span>
      </div>
      {showTagline && (
        <span className="mt-1 text-[9px] font-black uppercase tracking-[.28em] text-red-300">
          Video-first creator revenue OS
        </span>
      )}
    </div>
  );
}

export function VaultXPageShell({
  eyebrow = "Creator Revenue OS",
  title,
  subtitle,
  children,
  rightSlot,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-20 h-80 w-80 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[.035]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.65) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>
      <main className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/[.035] p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <VaultXLogo />
            <p className="mt-3 text-[11px] font-black uppercase tracking-[.28em] text-red-300">{eyebrow}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-.06em] text-white sm:text-5xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">{subtitle}</p>
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}

export function VaultXWorkflow({ steps, activeStep = 0 }: { steps: { label: string; detail: string; done?: boolean }[]; activeStep?: number }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="VaultX workflow">
      {steps.map((step, index) => {
        const active = index === activeStep;
        const done = Boolean(step.done) || index < activeStep;
        return (
          <div
            key={step.label}
            className={`rounded-3xl border p-4 transition-all ${active ? "border-red-400/70 bg-red-500/12 shadow-[0_0_40px_rgba(239,68,68,.16)]" : done ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/[.035]"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">Step {index + 1}</span>
              {done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : active ? <PlayCircle className="h-4 w-4 text-red-300" /> : <Lock className="h-4 w-4 text-zinc-600" />}
            </div>
            <h3 className="mt-3 text-sm font-black text-white">{step.label}</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{step.detail}</p>
          </div>
        );
      })}
    </section>
  );
}

export function VaultXActionCard({
  href,
  title,
  body,
  icon,
  cta = "Open",
  disabledReason,
}: {
  href: string;
  title: string;
  body: string;
  icon: ReactNode;
  cta?: string;
  disabledReason?: string;
}) {
  if (disabledReason) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5 opacity-70">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500">{icon}</div>
        <h3 className="text-lg font-black tracking-[-.03em] text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{body}</p>
        <p className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-xs font-bold text-zinc-500">Locked: {disabledReason}</p>
      </div>
    );
  }

  return (
    <a href={href} className="group block rounded-[1.75rem] border border-white/10 bg-white/[.045] p-5 shadow-xl shadow-black/25 transition-all hover:-translate-y-1 hover:border-red-400/50 hover:bg-red-500/[.075]">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-400/20">{icon}</div>
      <h3 className="text-lg font-black tracking-[-.03em] text-white">{title}</h3>
      <p className="mt-2 min-h-[72px] text-sm leading-6 text-zinc-400">{body}</p>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-black/40 px-4 py-3 text-sm font-black text-white">
        <span>{cta}</span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </a>
  );
}
