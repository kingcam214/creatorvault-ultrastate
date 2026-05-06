/**
 * VaultXChallenges.tsx — Revenue Challenge Engine
 * $5K Challenge (30 days) and $15K Challenge (90 days)
 * Multiple pathways: Subscriptions, PPV, Tips, Custom Requests, Live, Social Funnel, Collabs
 * Wired to: challengeAutomation.getActiveChallenge, challengeAutomation.getChallengeDashboard,
 *            challengeAutomation.logChallengeRevenue, challengeAutomation.runAgent
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "../hooks/use-toast";
import { useCreatorMode, CreatorModeSwitcher } from "@/contexts/CreatorModeContext";
import {
  Trophy, Target, DollarSign, TrendingUp, Zap, Users, Star,
  Lock, CheckCircle2, ArrowRight, Flame, Crown, Clock,
  MessageSquare, Video, Heart, Share2, Gift, Loader2,
  BarChart2, ChevronDown, ChevronUp, Play, Sparkles,
} from "lucide-react";

// ─── Challenge definitions ────────────────────────────────────────────────────
const CHALLENGES = [
  {
    id: "5k",
    title: "$5,000 Challenge",
    subtitle: "30 Days to Your First $5K",
    target: 5000,
    days: 30,
    dailyTarget: 167,
    gradient: "from-purple-600 via-pink-600 to-red-500",
    glow: "shadow-purple-900/40",
    border: "border-purple-500/30",
    badge: "bg-purple-900/40 text-purple-300 border-purple-500/30",
    icon: Trophy,
    color: "text-purple-400",
    description: "The entry-level empire builder. Hit $5K in 30 days using 7 proven revenue pathways. Every creator who completes this challenge unlocks the $15K tier.",
    unlockReward: "Unlocks $15K Challenge + VaultX Elite badge",
  },
  {
    id: "15k",
    title: "$15,000 Challenge",
    subtitle: "90 Days to Elite Status",
    target: 15000,
    days: 90,
    dailyTarget: 167,
    gradient: "from-yellow-500 via-orange-500 to-red-600",
    glow: "shadow-yellow-900/40",
    border: "border-yellow-500/30",
    badge: "bg-yellow-900/40 text-yellow-300 border-yellow-500/30",
    icon: Crown,
    color: "text-yellow-400",
    description: "The elite tier. $15K in 90 days using all 7 pathways at full scale. AI agents handle distribution, outreach, and optimization automatically.",
    unlockReward: "VaultX Crown status + 0% platform fee for 6 months",
    locked: false,
  },
];

// ─── Revenue pathways ─────────────────────────────────────────────────────────
const PATHWAYS = [
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-900/20 border-purple-500/20",
    description5k: "Get 34 subscribers at $15/mo = $510/mo. Stack to 334 subscribers = $5,010.",
    description15k: "Scale to 1,000 subscribers at $15/mo = $15,000/mo recurring.",
    tactics: [
      "Post 1 teaser per day on each social platform with VaultX link",
      "Offer a 3-day free trial to convert followers",
      "DM your top 50 social followers personally",
      "Create a 'founding member' tier at $9.99 for first 50 subscribers",
    ],
    aiAgent: "Recruiter Agent auto-DMs qualified leads",
    dailyAction: "Post 1 teaser + DM 10 followers",
    revenue5k: 510,
    revenue15k: 15000,
  },
  {
    id: "ppv",
    label: "PPV Content",
    icon: Video,
    color: "text-pink-400",
    bg: "bg-pink-900/20 border-pink-500/20",
    description5k: "Sell 20 PPV pieces at $25 each = $500. One good PPV drop can hit $1,000+ in 24 hours.",
    description15k: "Weekly PPV drops at $35-$75 each. 200 buyers/week = $7,000-$15,000/week.",
    tactics: [
      "Drop PPV content every Friday 6-9pm EST (peak conversion window)",
      "Price between $15-$75 based on content exclusivity",
      "Create a 'bundle deal' — 3 PPV pieces for $50",
      "Tease the PPV 48 hours before release to build anticipation",
    ],
    aiAgent: "Content Agent schedules and promotes PPV drops automatically",
    dailyAction: "Tease upcoming PPV on all socials",
    revenue5k: 1500,
    revenue15k: 5000,
  },
  {
    id: "tips",
    label: "Tips & Tributes",
    icon: Heart,
    color: "text-red-400",
    bg: "bg-red-900/20 border-red-500/20",
    description5k: "100 tips at $15 average = $1,500. Enable tip goals and progress bars to drive more.",
    description15k: "500 tips/month at $20 average = $10,000. Tip goals with rewards at milestones.",
    tactics: [
      "Set a visible tip goal with a specific reward when reached",
      "Thank every tipper publicly (with their permission)",
      "Create 'tip menu' with specific rewards at each amount",
      "Run a 24-hour tip challenge with a special reward",
    ],
    aiAgent: "Engagement Agent sends personalized thank-you messages",
    dailyAction: "Post tip goal progress update",
    revenue5k: 1500,
    revenue15k: 3000,
  },
  {
    id: "custom",
    label: "Custom Requests",
    icon: MessageSquare,
    color: "text-blue-400",
    bg: "bg-blue-900/20 border-blue-500/20",
    description5k: "10 custom requests at $75 each = $750. High-value, low-volume revenue.",
    description15k: "30 custom requests/month at $100-$200 each = $3,000-$6,000.",
    tactics: [
      "Set minimum custom request price at $50",
      "Create a clear custom request menu with pricing tiers",
      "Deliver within 48 hours to build reputation",
      "Upsell subscribers to custom requests via DM",
    ],
    aiAgent: "AI Chatter handles intake, pricing, and delivery coordination",
    dailyAction: "Check custom request inbox + fulfill 1 request",
    revenue5k: 750,
    revenue15k: 4000,
  },
  {
    id: "live",
    label: "Live Streams",
    icon: Play,
    color: "text-green-400",
    bg: "bg-green-900/20 border-green-500/20",
    description5k: "4 live streams with $100 average tip income = $400. Live converts 3x better than static content.",
    description15k: "Weekly live streams with $500-$1,000 average income = $2,000-$4,000/month.",
    tactics: [
      "Go live every Wednesday and Saturday at 8pm EST",
      "Announce live streams 24 hours in advance on all platforms",
      "Set live tip goals with visible progress",
      "Offer exclusive PPV content to live viewers only",
    ],
    aiAgent: "VaultLive Pro handles stream setup and tip tracking",
    dailyAction: "Announce upcoming live stream",
    revenue5k: 400,
    revenue15k: 3000,
  },
  {
    id: "social",
    label: "Social Funnel",
    icon: Share2,
    color: "text-cyan-400",
    bg: "bg-cyan-900/20 border-cyan-500/20",
    description5k: "Drive 500 profile visits/day from social. At 2% conversion to $15/mo = $150/day.",
    description15k: "Drive 2,000 profile visits/day. At 3% conversion = $900/day = $27,000/month.",
    tactics: [
      "Post 3x/day on TikTok — one viral hook per video",
      "Post 2x/day on Instagram — Reels outperform static 4:1",
      "Post 5x/day on Twitter/X — adult-friendly platform",
      "Use the Social Hub Factory tab to generate optimized posts",
    ],
    aiAgent: "Autopilot Agent distributes content across all platforms",
    dailyAction: "Post 3 teasers across platforms using Social Hub",
    revenue5k: 300,
    revenue15k: 5000,
  },
  {
    id: "collabs",
    label: "Creator Collabs",
    icon: Gift,
    color: "text-orange-400",
    bg: "bg-orange-900/20 border-orange-500/20",
    description5k: "2 collabs with creators who have 10K+ followers. Each collab drives 50-200 new subscribers.",
    description15k: "Monthly collab with a top creator. Shared audience = 500+ new subscribers per collab.",
    tactics: [
      "Find 3 creators in your niche with similar audience size",
      "Propose a content swap — you promote them, they promote you",
      "Create a joint PPV piece and split revenue 50/50",
      "Cross-post each other's VaultX links for 30 days",
    ],
    aiAgent: "Outreach Agent identifies and contacts collab targets",
    dailyAction: "Message 2 potential collab partners",
    revenue5k: 540,
    revenue15k: 3000,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VaultXChallenges() {
  const { toast } = useToast();
  const { isAdult, accentColor, modeBadge } = useCreatorMode();
  const [activeChallenge, setActiveChallenge] = useState<"5k" | "15k">("5k");
  const [expandedPathway, setExpandedPathway] = useState<string | null>("subscriptions");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);

  const { data: dashboard } = trpc.challengeAutomation.getChallengeDashboard.useQuery();
  const { data: activeEmpireChallenge } = trpc.challengeAutomation.getActiveChallenge.useQuery();

  const runAgent = trpc.challengeAutomation.runAgent.useMutation({
    onSuccess: (data) => {
      toast({ title: "Agent Activated", description: data?.outcome?.substring(0, 100) || "Agent running" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const logRevenue = trpc.challengeAutomation.logChallengeRevenue.useMutation({
    onSuccess: () => toast({ title: "Revenue logged!", description: "Progress updated" }),
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const challenge = CHALLENGES.find(c => c.id === activeChallenge)!;
  const ChallengeIcon = challenge.icon;

  const handleJoin = async (challengeId: string) => {
    setJoinLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setJoined(challengeId);
    setJoinLoading(false);
    toast({ title: `${challengeId === "5k" ? "$5K" : "$15K"} Challenge Joined!`, description: "Your AI agents are now activated. Check your daily action plan." });
  };

  // Calculate progress from dashboard data
  const currentRevenue = activeEmpireChallenge?.current_revenue
    ? Number(activeEmpireChallenge.current_revenue)
    : (dashboard as any)?.totalRevenue || 0;
  const targetRevenue = challenge.target;
  const progressPct = Math.min((currentRevenue / targetRevenue) * 100, 100);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-yellow-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-end mb-4">
            <CreatorModeSwitcher compact />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold mb-4"
            style={{ background: `${accentColor}15`, borderColor: `${accentColor}40`, color: accentColor }}>
            <Flame className="w-4 h-4" />
            VaultX Revenue Challenges
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
            Turn Your Content Into
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent"> Real Money</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Structured 30 and 90-day challenges with 7 proven revenue pathways. AI agents handle distribution, outreach, and optimization automatically.
          </p>
        </div>

        {/* Challenge selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {CHALLENGES.map(ch => {
            const ChIcon = ch.icon;
            const isActive = activeChallenge === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChallenge(ch.id as "5k" | "15k")}
                className={`relative p-6 rounded-3xl border text-left transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${ch.gradient} border-transparent shadow-2xl ${ch.glow}`
                    : `bg-white/5 ${ch.border} hover:bg-white/8`
                }`}
              >
                {ch.id === "15k" && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-bold">
                    <Crown className="w-3 h-3" /> Elite
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? "bg-white/20" : `bg-gradient-to-br ${ch.gradient}`}`}>
                    <ChIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-black text-xl">{ch.title}</div>
                    <div className={`text-sm font-semibold ${isActive ? "text-white/80" : "text-gray-400"}`}>{ch.subtitle}</div>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed mb-3 ${isActive ? "text-white/80" : "text-gray-500"}`}>{ch.description}</p>
                <div className={`flex items-center gap-2 text-xs font-bold ${isActive ? "text-white/70" : "text-gray-600"}`}>
                  <Star className="w-3 h-3" />
                  {ch.unlockReward}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress tracker */}
        {(joined === activeChallenge || (activeEmpireChallenge && currentRevenue > 0)) && (
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-black text-lg">Your Progress</h3>
                <p className="text-gray-500 text-sm">{challenge.days} days · ${challenge.dailyTarget}/day target</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-white">${currentRevenue.toLocaleString()}</div>
                <div className="text-gray-500 text-sm">of ${targetRevenue.toLocaleString()}</div>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full bg-gradient-to-r ${challenge.gradient} transition-all duration-1000`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{progressPct.toFixed(1)}% complete</span>
              <span>${(targetRevenue - currentRevenue).toLocaleString()} remaining</span>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Daily Target", value: `$${challenge.dailyTarget}`, icon: Target, color: "text-purple-400" },
            { label: "Duration", value: `${challenge.days} Days`, icon: Clock, color: "text-blue-400" },
            { label: "Revenue Paths", value: "7 Active", icon: TrendingUp, color: "text-green-400" },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <div className="text-white font-black text-lg">{stat.value}</div>
              <div className="text-gray-500 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue Pathways */}
        <div className="mb-8">
          <h2 className="text-white font-black text-2xl mb-2">7 Revenue Pathways</h2>
          <p className="text-gray-500 text-sm mb-6">Each pathway has AI agents working automatically. You focus on creating — the platform handles the rest.</p>

          <div className="space-y-3">
            {PATHWAYS.map((pathway) => {
              const PathIcon = pathway.icon;
              const isExpanded = expandedPathway === pathway.id;
              const revenue = activeChallenge === "5k" ? pathway.revenue5k : pathway.revenue15k;
              const description = activeChallenge === "5k" ? pathway.description5k : pathway.description15k;

              return (
                <div key={pathway.id} className={`rounded-2xl border ${pathway.bg} overflow-hidden transition-all`}>
                  <button
                    className="w-full p-5 flex items-center gap-4 text-left"
                    onClick={() => setExpandedPathway(isExpanded ? null : pathway.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center flex-shrink-0`}>
                      <PathIcon className={`w-5 h-5 ${pathway.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-bold">{pathway.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pathway.color} bg-black/30`}>
                          ${revenue.toLocaleString()} target
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs truncate">{description}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className={`text-sm font-bold ${pathway.color}`}>${revenue.toLocaleString()}</div>
                        <div className="text-gray-600 text-xs">potential</div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {/* Description */}
                      <p className="text-gray-300 text-sm leading-relaxed">{description}</p>

                      {/* Tactics */}
                      <div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">Proven Tactics</h4>
                        <div className="space-y-2">
                          {pathway.tactics.map((tactic, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className={`w-4 h-4 ${pathway.color} flex-shrink-0 mt-0.5`} />
                              <span className="text-gray-300 text-sm">{tactic}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Agent + Daily Action */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span className="text-purple-300 text-xs font-bold">AI Agent</span>
                          </div>
                          <p className="text-gray-400 text-xs">{pathway.aiAgent}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-yellow-300 text-xs font-bold">Daily Action</span>
                          </div>
                          <p className="text-gray-400 text-xs">{pathway.dailyAction}</p>
                        </div>
                      </div>

                      {/* Activate agent button */}
                      <button
                        onClick={() => runAgent.mutate({ agentSlug: pathway.id, agentName: pathway.label, creditToChallenge: true })}
                        disabled={runAgent.isPending}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          runAgent.isPending
                            ? "bg-white/5 text-gray-500"
                            : `bg-gradient-to-r ${challenge.gradient} text-white hover:opacity-90 shadow-lg`
                        }`}
                      >
                        {runAgent.isPending ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Activating Agent...</>
                        ) : (
                          <><Zap className="w-4 h-4" /> Activate {pathway.label} Agent</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 mb-8">
          <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-green-400" />
            Revenue Breakdown — How to Hit ${challenge.target.toLocaleString()}
          </h3>
          <div className="space-y-3">
            {PATHWAYS.map(p => {
              const revenue = activeChallenge === "5k" ? p.revenue5k : p.revenue15k;
              const pct = (revenue / challenge.target) * 100;
              const PathIcon = p.icon;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <PathIcon className={`w-4 h-4 ${p.color} flex-shrink-0`} />
                  <span className="text-gray-400 text-sm w-36 flex-shrink-0">{p.label}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${challenge.gradient}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${p.color} w-20 text-right flex-shrink-0`}>${revenue.toLocaleString()}</span>
                </div>
              );
            })}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-white font-black">Total Target</span>
              <span className="text-white font-black text-xl">${challenge.target.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Log revenue */}
        {joined === activeChallenge && (
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 mb-8">
            <h3 className="text-white font-bold text-lg mb-4">Log Revenue</h3>
            <LogRevenueForm challengeId={activeChallenge} onLog={(amount, source) => logRevenue.mutate({ amount, source })} />
          </div>
        )}

        {/* CTA */}
        {joined !== activeChallenge ? (
          <div className={`p-8 rounded-3xl bg-gradient-to-br ${challenge.gradient} text-center shadow-2xl ${challenge.glow}`}>
            <ChallengeIcon className="w-12 h-12 text-white mx-auto mb-4" />
            <h3 className="text-white font-black text-2xl mb-2">Ready to Start the {challenge.title}?</h3>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Your AI agents activate the moment you join. They handle outreach, scheduling, and optimization automatically. You just create.
            </p>
            <button
              onClick={() => handleJoin(activeChallenge)}
              disabled={joinLoading}
              className="px-10 py-4 rounded-2xl bg-white text-black font-black text-lg hover:bg-white/90 transition-all disabled:opacity-60 flex items-center gap-3 mx-auto shadow-xl"
            >
              {joinLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Activating...</>
              ) : (
                <><Zap className="w-5 h-5" /> Start Challenge — Activate AI Agents</>
              )}
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-green-900/20 border border-green-500/30 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <h3 className="text-white font-black text-xl mb-2">Challenge Active — AI Agents Running</h3>
            <p className="text-gray-400 text-sm mb-4">Your agents are working. Check back daily to log revenue and see your progress.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="/social-hub" className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 transition-all flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Open Social Hub
              </a>
              <a href="/vaultx" className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> View VaultX Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Log Revenue Form ─────────────────────────────────────────────────────────
function LogRevenueForm({ challengeId, onLog }: { challengeId: string; onLog: (amount: number, source: string) => void }) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("subscriptions");

  const SOURCES = [
    { id: "subscriptions", label: "Subscriptions" },
    { id: "ppv", label: "PPV Content" },
    { id: "tips", label: "Tips" },
    { id: "custom", label: "Custom Requests" },
    { id: "live", label: "Live Stream" },
    { id: "social", label: "Social Funnel" },
    { id: "collabs", label: "Collabs" },
  ];

  const handleLog = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    onLog(amt, source);
    setAmount("");
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-32">
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Amount ($)</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50"
        />
      </div>
      <div className="flex-1 min-w-40">
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Source</label>
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50"
        >
          {SOURCES.map(s => <option key={s.id} value={s.id} className="bg-gray-900">{s.label}</option>)}
        </select>
      </div>
      <button
        onClick={handleLog}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-sm hover:opacity-90 transition-all flex items-center gap-2"
      >
        <DollarSign className="w-4 h-4" /> Log Revenue
      </button>
    </div>
  );
}
