import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useGuidedMode } from "@/contexts/GuidedModeContext";
import TourEngine from "@/components/TourEngine";
import StartTourButton from "@/components/StartTourButton";
import { useTourEngine } from "@/hooks/useTourEngine";
import {
  BarChart2,
  Bot,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
  Crown,
  CreditCard,
  FileText,
  Flame,
  Globe,
  Image,
  Layers,
  Mic,
  Music,
  Palette,
  Rocket,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";

type ToolCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof Rocket;
  badge?: string;
};

const FEATURE_CARDS: ToolCard[] = [
  { title: "VaultX Editor", description: "Command revenue-safe output packages, creator briefs, Body Intel, and premium drops.", href: "/vault-x/editor", icon: Rocket, badge: "CORE" },
  { title: "VaultX Studio", description: "Production suite for final output bundles, distribution systems, analytics, and broadcasts.", href: "/vault-x/studio", icon: Video, badge: "PRO" },
  { title: "Image Lab", description: "Remove backgrounds, enhance lighting, upscale, and resize creator assets.", href: "/image-lab", icon: Image, badge: "NEW" },
  { title: "Flyer Composer", description: "Blend your photo into campaign flyers with polished creative control.", href: "/flyer-composer", icon: Layers, badge: "NEW" },
  { title: "Flyer Generator", description: "AI-powered professional event flyers for rapid promo launches.", href: "/flyer-generator", icon: FileText },
  { title: "Business Cards", description: "AI-designed business cards with clean brand presentation.", href: "/business-cards/ai-designer", icon: CreditCard },
  { title: "Animated Flyer Studio", description: "Turn static flyers into cinematic motion graphics.", href: "/animated-flyer-studio", icon: Video },
  { title: "VaultLive", description: "Stream live, earn tips, and compound audience demand.", href: "/vaultlive", icon: Camera },
  { title: "Viral Optimizer", description: "AI hooks, captions, and hashtag systems for faster discovery.", href: "/creator-tools", icon: Zap },
  { title: "Music Composer", description: "Generate original music and branded audio beds for content.", href: "/king/music-composer", icon: Music },
  { title: "Marketplace", description: "Sell content, presets, services, and productized creator assets.", href: "/marketplace", icon: ShoppingBag },
  { title: "Analytics", description: "Track performance and revenue across platform channels.", href: "/analytics", icon: BarChart2 },
  { title: "Podcast Studio", description: "Record, edit, and publish creator-led audio shows.", href: "/podcast-studio", icon: Mic },
  { title: "KingCam AI Clone", description: "Chat with the AI clone for operating guidance.", href: "/kingcam-clone", icon: Bot },
  { title: "Smart Album", description: "AI-powered photo vault with organized content intelligence.", href: "/smart-album", icon: Camera },
  { title: "VaultSnap", description: "Stories that earn from view one.", href: "/vault-snap", icon: Zap },
  { title: "VaultPass", description: "Fan subscriptions with creator-first economics.", href: "/vault-pass", icon: Crown },
  { title: "VaultDrop", description: "Limited drops engineered around scarcity and urgency.", href: "/vault-drop", icon: Flame },
  { title: "Vault Analytics", description: "Deep creator intelligence for revenue decisions.", href: "/vault-analytics", icon: BarChart2 },
  { title: "VaultMoment", description: "Capture moments that pay in real time.", href: "/vault-moment", icon: Zap },
  { title: "VaultRise", description: "Fans stake loyalty and rise with the creator brand.", href: "/vault-rise", icon: TrendingUp },
  { title: "VaultCulture", description: "Get paid for the trends you start.", href: "/vault-culture", icon: Globe },
  { title: "DayShift Doctor", description: "Empowerment brand for entertainers.", href: "/dayshift-doctor", icon: Stethoscope, badge: "BRAND" },
  { title: "Design Firm", description: "Full-service creative design studio.", href: "/design-department", icon: Palette, badge: "NEW" },
];

const CHECKLIST_PREVIEW = [
  { key: "uploadedFirstImage" as const, label: "Process your first image", href: "/image-lab" },
  { key: "createdFirstFlyer" as const, label: "Create a flyer", href: "/flyer-generator" },
  { key: "createdFirstCard" as const, label: "Design a business card", href: "/business-cards/ai-designer" },
  { key: "generatedFirstAnimation" as const, label: "Animate a flyer", href: "/animated-flyer-studio" },
];

const METRICS = [
  { label: "Revenue", value: "$0.00", sub: "Live rails armed", accent: "var(--accent-cyan)" },
  { label: "Subscribers", value: "0", sub: "Audience base", accent: "var(--accent-cyan)" },
  { label: "Content", value: "24", sub: "Assets indexed", accent: "var(--accent-gold)" },
  { label: "Empire Score", value: "87", sub: "Operating readiness", accent: "var(--success)" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { checklist, openChecklist } = useGuidedMode();
  const {
    tourOpen: kingcamTourOpen,
    steps: kingcamTourSteps,
    title: kingcamTourTitle,
    openTour: openKingcamTour,
    closeTour: closeKingcamTour,
    completeTour: completeKingcamTour,
    skipTour: skipKingcamTour,
  } = useTourEngine("dominican-creator-day1", {
    autoStartForDR: true,
    country: (user as any)?.country ?? undefined,
    language: (user as any)?.language ?? undefined,
  });

  const completionPercent = checklist?.completionPercent ?? 0;
  const itemsCompleted = checklist?.itemsCompleted ?? 0;
  const totalItems = checklist?.totalItems ?? 6;
  const creatorName = user?.name || "Cameron White";

  const tierOne = FEATURE_CARDS.slice(0, 2);
  const tierTwo = FEATURE_CARDS.slice(2);

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-void)] pb-28 text-white">
        <div className="pointer-events-none fixed inset-0 opacity-80">
          <div className="absolute left-[-18%] top-[-8%] h-[34rem] w-[34rem] rounded-full bg-[var(--accent-cyan-dim)] blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-12%] h-[32rem] w-[32rem] rounded-full bg-[var(--accent-gold-dim)] blur-3xl" />
          <div className="absolute left-0 top-0 h-full w-px bg-[var(--accent-cyan)]/20" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
          <header className="dashboard-header mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 font-['Space_Mono'] text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Empire Command Center</p>
                <h1 className="font-['Bebas_Neue'] text-4xl leading-none tracking-[0.06em] text-white md:text-5xl">{creatorName}</h1>
                <p className="mt-2 max-w-2xl font-['DM_Sans'] text-sm text-[var(--text-secondary)]">Your creator operating room is live. Build assets, launch drops, track the money path, and keep the platform moving like a real media empire.</p>
              </div>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4">
                  <div className="mb-1 flex items-center gap-2 font-['Space_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent-cyan)] cta-pulse" />
                    Live Revenue
                  </div>
                  <div className="live-stat font-['Space_Mono'] text-2xl font-bold text-[var(--accent-cyan)]">$0.00</div>
                </div>
                <StartTourButton tourId="dominican-creator-day1" label="Learn with KingCam" variant="pill" data-tour="learn-kingcam" onClick={openKingcamTour} />
              </div>
            </div>
          </header>

          {completionPercent < 100 && (
            <section className="getting-started-card mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5" data-tour="checklist">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)]">
                    <Sparkles className="h-5 w-5 text-[var(--accent-cyan)]" />
                  </div>
                  <div>
                    <h2 className="font-['Bebas_Neue'] text-2xl tracking-[0.08em] text-white">Launch Sequence</h2>
                    <p className="font-['DM_Sans'] text-xs text-[var(--text-muted)]">{itemsCompleted} of {totalItems} tasks complete</p>
                  </div>
                </div>
                <button onClick={openChecklist} className="flex items-center gap-1 font-['DM_Sans'] text-xs font-semibold text-[var(--accent-cyan)] transition hover:text-white">
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full rounded-full bg-[var(--accent-cyan)] transition-all duration-700" style={{ width: `${completionPercent}%` }} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CHECKLIST_PREVIEW.map((item) => {
                  const isDone = Boolean(checklist?.[item.key]);
                  return (
                    <Link key={item.key} href={item.href}>
                      <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-3 transition hover:border-[var(--border-accent)] hover:bg-[var(--bg-elevated)]">
                        {isDone ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--success)]" /> : <Circle className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />}
                        <span className={`font-['DM_Sans'] text-xs ${isDone ? "text-[var(--text-muted)] line-through" : "text-[var(--text-secondary)]"}`}>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="earnings">
            {METRICS.map((metric, index) => (
              <div key={metric.label} className="animate-fade-up overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5" style={{ animationDelay: `${index * 70}ms` }}>
                <p className="font-['DM_Sans'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{metric.label}</p>
                <div className="mt-2 font-['Bebas_Neue'] text-4xl leading-none tracking-[0.06em] text-white">{metric.value}</div>
                <p className="mt-2 font-['DM_Sans'] text-xs text-[var(--text-muted)]">{metric.sub}</p>
                <div className="mt-4 h-0.5 w-full origin-left animate-[fade-up_0.6s_ease_forwards] rounded-full" style={{ background: metric.accent }} />
              </div>
            ))}
          </section>

          <section className="mb-8" data-tour="tools">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Empire Tools</p>
                <h2 className="font-['Bebas_Neue'] text-3xl tracking-[0.08em] text-white">Build, Publish, Monetize</h2>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {tierOne.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href}>
                    <div className="group min-h-[178px] cursor-pointer rounded-3xl border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] p-6 transition duration-300 hover:border-[var(--accent-cyan)] hover:shadow-2xl hover:shadow-cyan-500/10">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <Icon className="h-8 w-8 text-[var(--accent-cyan)]" />
                        <span className="rounded-full border border-[var(--border-accent)] bg-[var(--bg-void)] px-3 py-1 font-['Space_Mono'] text-[9px] uppercase tracking-[0.14em] text-[var(--accent-cyan)]">{card.badge}</span>
                      </div>
                      <h3 className="font-['Bebas_Neue'] text-3xl tracking-[0.08em] text-white">{card.title}</h3>
                      <p className="mt-2 max-w-xl font-['DM_Sans'] text-[13px] leading-6 text-[var(--text-secondary)]">{card.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {tierTwo.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href}>
                    <div className="group relative min-h-[126px] cursor-pointer rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-l-2 hover:border-l-[var(--accent-cyan)] hover:bg-[var(--bg-elevated)]">
                      {card.badge && <span className="absolute right-3 top-3 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-['Space_Mono'] text-[9px] text-[var(--accent-cyan)]">{card.badge}</span>}
                      <Icon className="mb-3 h-5 w-5 text-[var(--accent-cyan)]" />
                      <h3 className="font-['DM_Sans'] text-sm font-semibold leading-tight text-white">{card.title}</h3>
                      <p className="mt-1 line-clamp-2 font-['DM_Sans'] text-xs leading-5 text-[var(--text-muted)]">{card.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <QuickStats />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-5 py-3 backdrop-blur-2xl">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/vault-x/editor">
              <div className="cta-pulse flex h-12 items-center justify-center rounded-xl bg-[var(--accent-cyan)] font-['Bebas_Neue'] text-base tracking-[0.1em] text-[var(--bg-void)]">Open VaultX Editor</div>
            </Link>
            <Link href="/king/challenge">
              <div className="flex h-12 items-center justify-center rounded-xl bg-[var(--accent-gold)] font-['Bebas_Neue'] text-base tracking-[0.1em] text-[var(--bg-void)]">Empire Challenge</div>
            </Link>
          </div>
        </div>
      </div>

      <TourEngine
        steps={kingcamTourSteps}
        isOpen={kingcamTourOpen}
        onComplete={completeKingcamTour}
        onSkip={skipKingcamTour}
        onClose={closeKingcamTour}
        tourTitle={kingcamTourTitle}
      />
    </>
  );
}

function QuickStats() {
  const { data: cards } = trpc.businessCards.getMyCards.useQuery({ limit: 3, offset: 0 }, { staleTime: 60 * 1000 });
  const { data: jobs } = trpc.animatedFlyer.getMyJobs.useQuery({ limit: 3, offset: 0 }, { staleTime: 60 * 1000 });

  const hasCards = Boolean(cards && cards.length > 0);
  const hasJobs = Boolean(jobs && jobs.length > 0);
  if (!hasCards && !hasJobs) return null;

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {hasCards && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-['Bebas_Neue'] text-2xl tracking-[0.08em] text-white">Recent Business Cards</h3>
            <Link href="/business-cards"><span className="font-['DM_Sans'] text-xs font-semibold text-[var(--accent-cyan)]">View all →</span></Link>
          </div>
          <div className="space-y-2">
            {(cards || []).slice(0, 3).map((card: any) => (
              <Link key={card.id} href={`/business-cards/editor/${card.id}`}>
                <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-[var(--border-accent)] hover:bg-[var(--bg-elevated)]">
                  <div className="h-6 w-10 flex-shrink-0 rounded border border-[var(--border-subtle)]" style={{ background: card.front_background_color ?? "#1A1A1A" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-['DM_Sans'] text-xs font-semibold text-white">{card.name ?? "Untitled Card"}</p>
                    <p className="font-['DM_Sans'] text-[11px] text-[var(--text-muted)]">{card.title ?? "Business card"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasJobs && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-['Bebas_Neue'] text-2xl tracking-[0.08em] text-white">Recent Motion Jobs</h3>
            <Link href="/animated-flyer-studio"><span className="font-['DM_Sans'] text-xs font-semibold text-[var(--accent-cyan)]">View all →</span></Link>
          </div>
          <div className="space-y-2">
            {(jobs || []).slice(0, 3).map((job: any) => (
              <Link key={job.id} href="/animated-flyer-studio">
                <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-[var(--border-accent)] hover:bg-[var(--bg-elevated)]">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)]">
                    <Video className="h-4 w-4 text-[var(--accent-cyan)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-['DM_Sans'] text-xs font-semibold text-white">{job.title ?? "Animated flyer"}</p>
                    <p className="font-['DM_Sans'] text-[11px] text-[var(--text-muted)]">{job.status ?? "Processing"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
