/**
 * DASHBOARD PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 * The CreatorVault command center. Shows:
 *   - Welcome header with user name
 *   - Getting Started progress widget (inline + opens full checklist)
 *   - Quick-access cards for all major features
 *   - Recent business cards and flyer jobs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Link } from "wouter";
  // @ts-ignore
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useGuidedMode } from "@/contexts/GuidedModeContext";
import TourEngine from "@/components/TourEngine";
  // @ts-ignore
import StartTourButton from "@/components/StartTourButton";
import { useTourEngine } from "@/hooks/useTourEngine";
import { Bot, Camera,
  Sparkles,
  // @ts-ignore
  Image,
  // @ts-ignore
  FileText,
  CreditCard,
  Video,
  // @ts-ignore
  Tv,
  BarChart2,
  ShoppingBag,
  Mic,
  Music,
  Zap,
  // @ts-ignore
  // @ts-ignore
  ChevronRight,
  Layers,
  // @ts-ignore
  CheckCircle2,
  Circle,
  // @ts-ignore
  BookOpen,
  Crown,
  // @ts-ignore
  Flame, TrendingUp, Globe, Palette, Stethoscope} from "lucide-react";

// ─── Feature cards data ───────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    title: "Image Lab",
    description: "Remove backgrounds, enhance lighting, upscale & resize",
    href: "/image-lab",
    icon: Image,
    color: "oklch(0.65 0.22 290)",
    bg: "oklch(0.65 0.22 290 / 0.12)",
    border: "oklch(0.65 0.22 290 / 0.25)",
    badge: "NEW",
  },
  {
    title: "Flyer Composer",
    description: "Blend your photo into any flyer -- Photoshop-style in seconds",
    href: "/flyer-composer",
    icon: Layers,
    color: "oklch(0.7 0.22 310)",
    bg: "oklch(0.7 0.22 310 / 0.12)",
    border: "oklch(0.7 0.22 310 / 0.25)",
    badge: "NEW",
  },
  {
    title: "Flyer Generator",
    description: "AI-powered professional event flyers in seconds",
    href: "/flyer-generator",
    icon: FileText,
    color: "oklch(0.65 0.24 350)",
    bg: "oklch(0.65 0.24 350 / 0.12)",
    border: "oklch(0.65 0.24 350 / 0.25)",
  },
  {
    title: "Business Cards",
    description: "AI-designed cards with background removal",
    href: "/business-cards/ai-designer",
    icon: CreditCard,
    color: "oklch(0.7 0.18 200)",
    bg: "oklch(0.7 0.18 200 / 0.12)",
    border: "oklch(0.7 0.18 200 / 0.25)",
  },
  {
    title: "Animated Flyer Studio",
    description: "Turn static flyers into cinematic motion graphics",
    href: "/animated-flyer-studio",
    icon: Video,
    color: "oklch(0.7 0.2 60)",
    bg: "oklch(0.7 0.2 60 / 0.12)",
    border: "oklch(0.7 0.2 60 / 0.25)",
  },
  {
    title: "VaultLive",
    description: "Stream live, earn tips, build your audience",
  // @ts-ignore
    href: "/vaultlive",
    icon: Tv,
  // @ts-ignore
    color: "oklch(0.65 0.22 290)",
    bg: "oklch(0.65 0.22 290 / 0.12)",
    border: "oklch(0.65 0.22 290 / 0.25)",
  },
  // @ts-ignore
  {
    title: "Viral Optimizer",
    description: "AI hooks, captions, and hashtag strategy",
    href: "/creator-tools",
    icon: Zap,
    color: "oklch(0.75 0.2 130)",
    bg: "oklch(0.75 0.2 130 / 0.12)",
    border: "oklch(0.75 0.2 130 / 0.25)",
  },
  {
    title: "Music Composer",
    description: "Generate original music for your content",
    href: "/king/music-composer",
    icon: Music,
    color: "oklch(0.7 0.22 320)",
    bg: "oklch(0.7 0.22 320 / 0.12)",
    border: "oklch(0.7 0.22 320 / 0.25)",
  },
  {
    title: "Marketplace",
    description: "Sell your content, presets, and services",
    href: "/marketplace",
    icon: ShoppingBag,
    color: "oklch(0.7 0.18 45)",
    bg: "oklch(0.7 0.18 45 / 0.12)",
    border: "oklch(0.7 0.18 45 / 0.25)",
  },
  {
    title: "Analytics",
    description: "Track performance across all platforms",
    href: "/analytics",
    icon: BarChart2,
    color: "oklch(0.65 0.22 290)",
    bg: "oklch(0.65 0.22 290 / 0.12)",
  // @ts-ignore
    border: "oklch(0.65 0.22 290 / 0.25)",
  // @ts-ignore
  // @ts-ignore
  },
  {
  // @ts-ignore
    title: "Podcast Studio",
    description: "Record, edit, and publish your podcast",
  // @ts-ignore
  // @ts-ignore
    href: "/podcast-studio",
  // @ts-ignore
    icon: Mic,
    color: "oklch(0.7 0.22 200)",
    bg: "oklch(0.7 0.22 200 / 0.12)",
  // @ts-ignore
  // @ts-ignore
    border: "oklch(0.7 0.22 200 / 0.25)",
  },
  // @ts-ignore
  {
    icon: Bot,
  // @ts-ignore
  // @ts-ignore
    label: "KingCam AI Clone",
  // @ts-ignore
  // @ts-ignore
    description: "Chat with your AI clone",
    href: "/kingcam-clone",
    color: "oklch(0.65 0.22 290)",
    bg: "oklch(0.65 0.22 290 / 0.12)",
  },
  {
    icon: Camera,
    label: "Smart Album",
    description: "AI-powered photo vault",
    href: "/smart-album",
  // @ts-ignore
    color: "oklch(0.65 0.22 140)",
  // @ts-ignore
    bg: "oklch(0.65 0.22 140 / 0.12)",
  // @ts-ignore
  },
  // @ts-ignore
  {
  // @ts-ignore
    icon: Zap,
    label: "VaultSnap",
    description: "Stories that earn from view 1",
    href: "/vault-snap",
    color: "oklch(0.65 0.22 290)",
    bg: "oklch(0.65 0.22 290 / 0.12)",
  },
  {
    icon: Crown,
    label: "VaultPass",
    description: "Fan subscriptions -- 90% yours",
    href: "/vault-pass",
    color: "oklch(0.75 0.18 60)",
    bg: "oklch(0.75 0.18 60 / 0.12)",
  // @ts-ignore
  },
  // @ts-ignore
  {
  // @ts-ignore
    icon: Flame,
  // @ts-ignore
    label: "VaultDrop",
    description: "Limited drops with scarcity",
    href: "/vault-drop",
    color: "oklch(0.65 0.22 20)",
    bg: "oklch(0.65 0.22 20 / 0.12)",
  },
  {
    icon: BarChart2,
  // @ts-ignore
    label: "Vault Analytics",
    description: "Full creator intelligence",
    href: "/vault-analytics",
    color: "oklch(0.65 0.22 230)",
    bg: "oklch(0.65 0.22 230 / 0.12)",
  },
  // @ts-ignore
  // @ts-ignore
  {
    icon: Zap,
    label: "VaultMoment",
    description: "Capture moments that pay in real time",
    href: "/vault-moment",
    color: "oklch(0.70 0.22 50)",
    bg: "oklch(0.70 0.22 50 / 0.12)",
  // @ts-ignore
  },
  {
    icon: TrendingUp,
    label: "VaultRise",
    description: "Fans stake loyalty -- rise together",
    href: "/vault-rise",
    color: "oklch(0.65 0.22 310)",
  // @ts-ignore
  // @ts-ignore
    bg: "oklch(0.65 0.22 310 / 0.12)",
  },
  {
    icon: Globe,
    label: "VaultCulture",
    description: "Get paid for the trends you start",
    href: "/vault-culture",
  // @ts-ignore
    color: "oklch(0.65 0.22 160)",
    bg: "oklch(0.65 0.22 160 / 0.12)",
  },
  {
    title: "DayShift Doctor",
    description: "Empowerment brand for entertainers",
    href: "/dayshift-doctor",
    icon: Stethoscope,
    color: "oklch(0.65 0.22 170)",
    bg: "oklch(0.65 0.22 170 / 0.12)",
    border: "oklch(0.65 0.22 170 / 0.25)",
    badge: "BRAND",
  },
  {
    title: "Design Firm",
    description: "Full-service creative design studio",
    href: "/design-department",
    icon: Palette,
    color: "oklch(0.65 0.22 310)",
    bg: "oklch(0.65 0.22 310 / 0.12)",
    border: "oklch(0.65 0.22 310 / 0.25)",
    badge: "NEW",
  },
];

// ─── Checklist items ──────────────────────────────────────────────────────────
  // @ts-ignore

const CHECKLIST_PREVIEW = [
  { key: "uploadedFirstImage" as const, label: "Process your first image", href: "/image-lab" },
  { key: "createdFirstFlyer" as const, label: "Create a flyer", href: "/flyer-generator" },
  { key: "createdFirstCard" as const, label: "Design a business card", href: "/business-cards/ai-designer" },
  { key: "generatedFirstAnimation" as const, label: "Animate a flyer", href: "/animated-flyer-studio" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const { checklist, openChecklist, startTour } = useGuidedMode();

  // ─── KingCam Tours ──────────────────────────────────────────────────────────
  const {
    tourOpen: kingcamTourOpen,
    steps: kingcamTourSteps,
  // @ts-ignore
    title: kingcamTourTitle,
    openTour: openKingcamTour,
    closeTour: closeKingcamTour,
    completeTour: completeKingcamTour,
    skipTour: skipKingcamTour,
  } = useTourEngine('dominican-creator-day1', {
    autoStartForDR: true,
    country: (user as any)?.country ?? undefined,
    language: (user as any)?.language ?? undefined,
  });

  const completionPercent = checklist?.completionPercent ?? 0;
  const itemsCompleted = checklist?.itemsCompleted ?? 0;
  const totalItems = checklist?.totalItems ?? 6;

  const firstName = user?.name?.split(" ")[0] ?? "Creator";

  return (<>
  // @ts-ignore
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.12 0.02 290)" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Welcome header ── */}
        <div className="mb-10 dashboard-header">
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="text-4xl font-black tracking-tight mb-1"
                style={{ color: "oklch(0.92 0.005 290)" }}
              >
                Welcome back,{" "}
                <span style={{ color: "oklch(0.65 0.22 290)" }}>
                  {firstName}
                </span>
              </h1>
              <p
                className="text-base"
                style={{ color: "oklch(0.55 0.01 290)" }}
              >
                Your empire is ready. What are we building today?
              </p>
            </div>

            {/* Tour button */}
            <StartTourButton
  // @ts-ignore
              tourId="dominican-creator-day1"
              label="Learn with KingCam"
              variant="pill"
              data-tour="learn-kingcam"
              onClick={openKingcamTour}
            />
          </div>
        </div>

        {/* ── Getting Started widget ── */}
        {completionPercent < 100 && (
          <div
            className="rounded-2xl p-5 mb-10 getting-started-card" data-tour="checklist"
            style={{
              background: "oklch(0.16 0.025 290)",
              border: "1px solid oklch(0.25 0.04 290)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "oklch(0.65 0.22 290 / 0.2)" }}
                >
                  <Sparkles size={16} style={{ color: "oklch(0.65 0.22 290)" }} />
                </div>
                <div>
                  <h2
                    className="text-sm font-bold"
                    style={{ color: "oklch(0.88 0.005 290)" }}
                  >
                    Getting Started
                  </h2>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.5 0.01 290)" }}
                  >
                    {itemsCompleted} of {totalItems} tasks complete
                  </p>
                </div>
              </div>

              <button
                onClick={openChecklist}
                className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80"
                style={{ color: "oklch(0.65 0.22 290)" }}
              >
                View all
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Progress bar */}
            <div
              className="h-2 rounded-full overflow-hidden mb-4"
              style={{ background: "oklch(0.22 0.035 290)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completionPercent}%`,
                  background: "linear-gradient(90deg, oklch(0.65 0.22 290), oklch(0.65 0.24 350))",
                }}
              />
            </div>

            {/* Preview items */}
            <div className="grid grid-cols-2 gap-2">
              {CHECKLIST_PREVIEW.map((item) => {
                const isDone = checklist?.[item.key] ?? false;
                return (
                  <Link key={item.key} href={item.href}>
                    <div
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                    >
                      {isDone ? (
                        <CheckCircle2
                          size={15}
                          style={{ color: "oklch(0.65 0.22 290)", flexShrink: 0 }}
                        />
                      ) : (
                        <Circle
  // @ts-ignore
                          size={15}
  // @ts-ignore
                          style={{ color: "oklch(0.4 0.01 290)", flexShrink: 0 }}
                        />
                      )}
  // @ts-ignore
                      <span
                        className="text-xs"
                        style={{
                          color: isDone
                            ? "oklch(0.55 0.01 290)"
                            : "oklch(0.75 0.005 290)",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Feature grid ── */}
        <div className="mb-6" data-tour="tools">
          <h2
            className="text-lg font-bold mb-4"
            style={{ color: "oklch(0.88 0.005 290)" }}
          >
            Your Tools
          </h2>
  // @ts-ignore
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
  // @ts-ignore
            {FEATURE_CARDS.map((card) => {
  // @ts-ignore
              const Icon = card.icon;
  // @ts-ignore
              return (
  // @ts-ignore
                <Link key={card.href} href={card.href}>
                  <div
                    className="relative rounded-xl p-4 cursor-pointer transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: card.bg,
                      border: `1px solid ${card.border}`,
                    }}
                  >
                    {card.badge && (
                      <span
                        className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{
                          background: card.color,
  // @ts-ignore
                          color: "oklch(0.98 0 0)",
                        }}
                      >
                        {card.badge}
                      </span>
                    )}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: `${card.color} / 0.2` }}
  // @ts-ignore
                    >
                      <Icon size={18} style={{ color: card.color }} />
                    </div>
  // @ts-ignore
                    <h3
  // @ts-ignore
                      className="text-sm font-bold mb-1 leading-tight"
                      style={{ color: "oklch(0.88 0.005 290)" }}
                    >
                      {card.title}
                    </h3>
  // @ts-ignore
                    <p
                      className="text-xs leading-snug"
                      style={{ color: "oklch(0.5 0.01 290)" }}
                    >
  // @ts-ignore
                      {card.description}
  // @ts-ignore
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Quick stats ── */}
        <div data-tour="earnings"><QuickStats /></div>
      </div>
    </div>

    {/* ── KingCam TourEngine ── */}
    <TourEngine
  // @ts-ignore
      steps={kingcamTourSteps}
      isOpen={kingcamTourOpen}
      onComplete={completeKingcamTour}
      onSkip={skipKingcamTour}
      onClose={closeKingcamTour}
      tourTitle={kingcamTourTitle}
    />
  </>);
}

  // @ts-ignore
// ─── Quick Stats ──────────────────────────────────────────────────────────────

function QuickStats() {
  const { data: cards } = trpc.businessCards.getMyCards.useQuery(
  // @ts-ignore
    { limit: 3, offset: 0 },
    { staleTime: 60 * 1000 }
  // @ts-ignore
  );
  // @ts-ignore

  const { data: jobs } = trpc.animatedFlyer.getMyJobs.useQuery(
  // @ts-ignore
    { limit: 3, offset: 0 },
    { staleTime: 60 * 1000 }
  );

  // @ts-ignore
  const hasCards = cards && cards.length > 0;
  // @ts-ignore
  const hasJobs = jobs && jobs.length > 0;

  if (!hasCards && !hasJobs) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* Recent business cards */}
      {hasCards && (
  // @ts-ignore
        <div
          className="rounded-2xl p-5"
          style={{
            background: "oklch(0.16 0.025 290)",
            border: "1px solid oklch(0.25 0.04 290)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-bold"
              style={{ color: "oklch(0.88 0.005 290)" }}
  // @ts-ignore
            >
              Recent Business Cards
            </h3>
  // @ts-ignore
            <Link href="/business-cards">
              <span
                className="text-xs font-semibold"
                style={{ color: "oklch(0.65 0.22 290)" }}
              >
                View all →
              </span>
            </Link>
          </div>
          <div className="space-y-2">
  // @ts-ignore
            {cards.slice(0, 3).map((card: any) => (
              <Link key={card.id} href={`/business-cards/editor/${card.id}`}>
                <div
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                >
                  <div
                    className="w-8 h-5 rounded flex-shrink-0"
                    style={{
                      background: card.front_background_color ?? "#1a1a2e",
                      border: "1px solid oklch(0.3 0.04 290)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
  // @ts-ignore
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: "oklch(0.8 0.005 290)" }}
                    >
                      {card.name ?? "Untitled Card"}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "oklch(0.5 0.01 290)" }}
  // @ts-ignore
                    >
                      {card.card_type ?? "standard"}
  // @ts-ignore
  // @ts-ignore
                    </p>
                  </div>
                  <ChevronRight size={12} style={{ color: "oklch(0.4 0.01 290)" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent animation jobs */}
  // @ts-ignore
      {hasJobs && (
  // @ts-ignore
        <div
          className="rounded-2xl p-5"
  // @ts-ignore
          style={{
            background: "oklch(0.16 0.025 290)",
            border: "1px solid oklch(0.25 0.04 290)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
  // @ts-ignore
              className="text-sm font-bold"
              style={{ color: "oklch(0.88 0.005 290)" }}
  // @ts-ignore
            >
  // @ts-ignore
              Recent Animations
  // @ts-ignore
            </h3>
            <Link href="/animated-flyer-studio">
              <span
                className="text-xs font-semibold"
                style={{ color: "oklch(0.65 0.22 290)" }}
              >
                View all →
              </span>
            </Link>
  // @ts-ignore
          </div>
          <div className="space-y-2">
  // @ts-ignore
            {jobs.slice(0, 3).map((job: any) => (
              <div
  // @ts-ignore
                key={job.id}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background:
                      job.status === "completed"
                        ? "oklch(0.75 0.2 130)"
  // @ts-ignore
                        : job.status === "failed"
                        ? "oklch(0.65 0.24 27)"
                        : "oklch(0.65 0.22 290)",
  // @ts-ignore
                  }}
  // @ts-ignore
                />
  // @ts-ignore
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: "oklch(0.8 0.005 290)" }}
                  >
                    {job.flyer_title ?? "Untitled Animation"}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.5 0.01 290)" }}
                  >
                    {job.status} · {job.model_tier ?? "standard"}
                  </p>
                </div>
  // @ts-ignore
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
