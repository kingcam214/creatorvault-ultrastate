import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, AlertTriangle, Star, DollarSign, CheckCircle, Flame } from "lucide-react";

const TIERS: Record<number, { label: string; color: string; bg: string; border: string; icon: string; nextAt: number | null; perks: string[] }> = {
  5: { label: "Elite — Ride or Die", color: "text-yellow-400", bg: "from-yellow-900/40 to-orange-900/40", border: "border-yellow-500/50", icon: "👑", nextAt: null,
    perks: ["70% revenue split", "$250/month loyalty bonus", "Co-Creator Status", "Greatest Show Headline Slot"] },
  4: { label: "Trusted", color: "text-emerald-400", bg: "from-emerald-900/40 to-teal-900/40", border: "border-emerald-500/50", icon: "💎", nextAt: 850,
    perks: ["60% revenue split", "$100/month bonus", "Brand Deal Priority Access"] },
  3: { label: "Developing", color: "text-blue-400", bg: "from-blue-900/40 to-indigo-900/40", border: "border-blue-500/50", icon: "⭐", nextAt: 700,
    perks: ["55% revenue split", "Content Coaching Sessions"] },
  2: { label: "On Notice", color: "text-orange-400", bg: "from-orange-900/40 to-red-900/40", border: "border-orange-500/50", icon: "⚠️", nextAt: 550,
    perks: ["50% split — standard rate", "No bonuses until tier improves"] },
  1: { label: "Probation", color: "text-red-400", bg: "from-red-900/40 to-rose-900/40", border: "border-red-500/50", icon: "🚨", nextAt: 400,
    perks: ["Basic access only", "One more violation = removed"] },
  0: { label: "Removed", color: "text-gray-500", bg: "from-gray-900/40 to-gray-900/40", border: "border-gray-700", icon: "💀", nextAt: null,
    perks: ["No longer in the program"] },
};

const POINT_GUIDE = [
  { action: "Complete a task on time", points: "+10", positive: true },
  { action: "Post content (TikTok/IG/YouTube)", points: "+3", positive: true },
  { action: "Go LIVE", points: "+5", positive: true },
  { action: "Hit a revenue milestone", points: "+25", positive: true },
  { action: "Close a brand deal", points: "+50", positive: true },
  { action: "Proactively honest (disclose an issue)", points: "+30", positive: true },
  { action: "30 days with no violations", points: "+50", positive: true },
  { action: "Skip a task", points: "-15", positive: false },
  { action: "Lie caught (low impact)", points: "-50", positive: false },
  { action: "Lie caught (medium impact)", points: "-100", positive: false },
  { action: "Lie caught (high impact)", points: "-200", positive: false },
  { action: "Warning issued", points: "-50 to -150", positive: false },
];

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-white/5 rounded-full h-3">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MyLoyaltyPortal() {
  const { data: profile, isLoading } = trpc.loyalty.getMyProfile.useQuery();
  const { data: myEvents } = trpc.loyalty.getMyEvents.useQuery();
  const { data: myWarnings } = trpc.loyalty.getMyWarnings.useQuery();

  if (isLoading) return (
    <div className="text-center text-white/40 py-12">Loading your loyalty profile...</div>
  );
  if (!profile) return (
    <div className="text-center text-white/40 py-12">No loyalty profile found.</div>
  );

  const p: any = profile;
  const tier = TIERS[p.tier] ?? TIERS[3];
  const ptsToNext = tier.nextAt ? tier.nextAt - p.loyalty_score : null;
  const taskRate = p.total_tasks_assigned > 0
    ? Math.round((p.total_tasks_completed / p.total_tasks_assigned) * 100) : 0;
  const activeWarnings = (myWarnings as any[] | undefined)?.filter((w: any) => !w.resolved) ?? [];

  return (
    <div className="space-y-8 p-6">
      {/* HERO */}
      <div className={`rounded-3xl p-8 bg-gradient-to-br ${tier.bg} border-2 ${tier.border} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.05)_0%,_transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-5xl mb-2">{tier.icon}</div>
              <h2 className="text-3xl font-black text-white">{p.chica_name}</h2>
              <div className={`text-xl font-bold ${tier.color} mt-1`}>{tier.label}</div>
            </div>
            <div className="text-right">
              <div className={`text-6xl font-black ${tier.color}`}>{p.loyalty_score}</div>
              <div className="text-white/40 text-sm">/ 1000 points</div>
              {ptsToNext && <div className="text-white/60 text-xs mt-1">{ptsToNext} pts to next tier</div>}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>Loyalty Score</span><span className={tier.color}>{p.loyalty_score}/1000</span>
              </div>
              <ScoreBar value={p.loyalty_score} max={1000}
                color={p.tier >= 4 ? "bg-emerald-500" : p.tier >= 3 ? "bg-blue-500" : "bg-orange-500"} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>Honesty Score</span>
                <span className={p.honesty_score >= 80 ? "text-emerald-400" : "text-red-400"}>{p.honesty_score}/100</span>
              </div>
              <ScoreBar value={p.honesty_score} max={100}
                color={p.honesty_score >= 80 ? "bg-emerald-500" : "bg-red-500"} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>Task Completion</span>
                <span className={taskRate >= 70 ? "text-emerald-400" : "text-orange-400"}>{taskRate}%</span>
              </div>
              <ScoreBar value={taskRate} max={100} color={taskRate >= 70 ? "bg-emerald-500" : "bg-orange-500"} />
            </div>
          </div>
        </div>
      </div>

      {/* WHAT YOU EARN */}
      <Card className={`p-6 bg-gradient-to-br ${tier.bg} border ${tier.border}`}>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className={`w-5 h-5 ${tier.color}`} /> What You Earn at {tier.label}
        </h3>
        <div className="space-y-2 mb-6">
          {tier.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <CheckCircle className={`w-4 h-4 ${tier.color} shrink-0`} />
              <span className="text-white/80 text-sm">{perk}</span>
            </div>
          ))}
        </div>
        {p.tier < 5 && (
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="text-xs text-white/40 uppercase tracking-wide mb-2">
              Unlock at {TIERS[p.tier + 1]?.label} ({tier.nextAt} pts)
            </div>
            {TIERS[p.tier + 1]?.perks.map((perk, i) => (
              <div key={i} className="text-sm text-white/40 flex items-center gap-2">
                <span className="text-white/20">→</span> {perk}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ACTIVE WARNINGS */}
      {activeWarnings.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-red-950 to-orange-950 border border-red-500/40">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Active Warnings ({activeWarnings.length})
          </h3>
          <div className="space-y-3">
            {activeWarnings.map((w: any) => (
              <div key={w.id} className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-white text-sm">{w.title || w.category}</div>
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">{w.severity?.toUpperCase()}</Badge>
                </div>
                <p className="text-white/70 text-sm mb-2">{w.description}</p>
                <div className="text-xs text-red-300/70">Consequence: {w.consequence}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* HOW POINTS WORK */}
      <Card className="p-6 bg-white/3 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" /> How Points Work
        </h3>
        <p className="text-white/50 text-sm mb-4">
          Every action you take — or don't take — is tracked. Points go up when you show up. 
          Points go down when you don't. There's no hiding from the system.
        </p>
        <div className="space-y-2">
          {POINT_GUIDE.map((item, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded-lg text-sm">
              <span className="text-white/70">{item.action}</span>
              <span className={`font-bold ${item.positive ? "text-emerald-400" : "text-red-400"}`}>{item.points}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* RECENT ACTIVITY */}
      <Card className="p-6 bg-white/3 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" /> Your Recent Activity
        </h3>
        {myEvents && (myEvents as any[]).length > 0 ? (
          <div className="space-y-2">
            {(myEvents as any[]).slice(0, 10).map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <span className={ev.points_change > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {ev.points_change > 0 ? "+" : ""}{ev.points_change}
                  </span>
                  <span className="text-white/70">{ev.description}</span>
                </div>
                <span className="text-white/30 text-xs">{new Date(ev.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm">No events yet. Start posting, completing tasks, and showing up.</p>
        )}
      </Card>

      {/* THE RULES */}
      <Card className="p-6 bg-gradient-to-br from-gray-900 to-black border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">
          <Shield className="w-5 h-5 inline mr-2 text-yellow-400" /> The Rules — Read This
        </h3>
        <div className="space-y-3 text-sm text-white/70">
          <p>1. <strong className="text-white">Honesty is non-negotiable.</strong> If you lie about anything — followers, revenue, content, personal situations — it gets logged. Every time. No exceptions.</p>
          <p>2. <strong className="text-white">Tasks are not optional.</strong> Every skipped task is -15 points. Miss enough and your tier drops. Your tier determines your pay.</p>
          <p>3. <strong className="text-white">Your score is always visible to KingCam.</strong> There is no private version of your behavior in this system.</p>
          <p>4. <strong className="text-white">Three warnings = probation.</strong> Probation means one more strike and you're out of the program permanently.</p>
          <p>5. <strong className="text-white">Loyalty is rewarded, not assumed.</strong> You earn your tier. You don't start at Elite. You work up to it.</p>
          <p>6. <strong className="text-white">Being proactively honest earns you +30 points.</strong> If something goes wrong, tell KingCam before he finds out. That's the only way to get credit for honesty.</p>
        </div>
      </Card>
    </div>
  );
}
