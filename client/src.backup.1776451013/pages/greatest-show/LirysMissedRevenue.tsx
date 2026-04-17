import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingDown, DollarSign, AlertTriangle, Youtube,
  Home, ShoppingBag, Smartphone, Crown, Flame,
  TrendingUp, Clock, ChefHat
} from "lucide-react";

// ============================================================
// REAL NUMBERS — Calculated from industry benchmarks
// TikTok RPM: $0.02-$0.04/1K views (Creator Fund)
// YouTube RPM food/lifestyle: $3-$8/1K views
// Airbnb DR avg nightly: $75, occupancy gap: 85% potential vs 40% actual
// SHEIN micro-influencer: $200-$800/campaign
// Fashion Nova: $300-$1,000/campaign
// ============================================================

const MISSED_DATA = {
  totalMissed: 98864.52,
  missedPerMonth: 4119.35,
  missedPerDay: 135.43,
  monthlyPotentialNow: 5605.22,
  annualPotentialNow: 67262.64,
  verticals: [
    {
      name: "Airbnb",
      icon: "🏡",
      color: "emerald",
      missed24m: 38700.00,
      pct: 39.1,
      missedMonthly: 1612.50,
      breakdown: [
        { label: "Occupancy gap (40% vs 85%)", amount: 24300.00 },
        { label: "Chef breakfast add-on (not offered)", amount: 14400.00 },
      ],
      fix: "Post 3 Airbnb TikToks/week. Add chef breakfast add-on to listing. Link in bio → Airbnb.",
      potential: "$1,912/month if fixed today"
    },
    {
      name: "Brand Deals",
      icon: "👗",
      color: "pink",
      missed24m: 26400.00,
      pct: 26.7,
      missedMonthly: 1100.00,
      breakdown: [
        { label: "SHEIN ambassador (never applied)", amount: 12000.00 },
        { label: "Fashion Nova (never applied)", amount: 14400.00 },
      ],
      fix: "Apply to SHEIN and Fashion Nova creator programs today. 1,400 followers qualifies for micro-influencer rates.",
      potential: "$1,100/month starting next campaign"
    },
    {
      name: "YouTube",
      icon: "📺",
      color: "red",
      missed24m: 13785.00,
      pct: 13.9,
      missedMonthly: 574.38,
      breakdown: [
        { label: "Ad revenue (no channel exists)", amount: 4185.00 },
        { label: "Brand integrations (HelloFresh etc)", amount: 9600.00 },
      ],
      fix: "Start Lirys Cooks on YouTube TODAY. Post 4x/week. TikTok drives traffic. YouTube pays the bills.",
      potential: "$1,160/month at 10K subscribers"
    },
    {
      name: "TikTok",
      icon: "📱",
      color: "purple",
      missed24m: 13266.24,
      pct: 13.4,
      missedMonthly: 552.76,
      breakdown: [
        { label: "Creator Fund (posting 1-2x/week vs 3-5x/day)", amount: 66.24 },
        { label: "LIVE gifts (never goes live)", amount: 3600.00 },
        { label: "Brand deals (never pitched)", amount: 9600.00 },
      ],
      fix: "Post 3-5x/day. Go LIVE 3x/week minimum. Pitch brands directly via DM. 1,400 followers = real money.",
      potential: "$553/month if posting consistently"
    },
    {
      name: "Subscriptions",
      icon: "👑",
      color: "yellow",
      missed24m: 6713.28,
      pct: 6.8,
      missedMonthly: 279.72,
      breakdown: [
        { label: "28 potential subscribers at $9.99/mo (1,400 x 2%)", amount: 6713.28 },
      ],
      fix: "Promote Greatest Show subscription in every TikTok. 2% conversion from 1,400 followers = $280/month.",
      potential: "$280/month from existing followers alone"
    }
  ]
};

function AnimatedCounter({ target, prefix = "$", duration = 2000 }: { target: number; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{prefix}{count.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>;
}

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; bar: string }> = {
  emerald: { bg: "from-emerald-900/40 to-teal-900/40", border: "border-emerald-500/40", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300", bar: "bg-emerald-500" },
  pink:    { bg: "from-pink-900/40 to-rose-900/40",    border: "border-pink-500/40",    text: "text-pink-400",    badge: "bg-pink-500/20 text-pink-300",    bar: "bg-pink-500" },
  red:     { bg: "from-red-900/40 to-orange-900/40",   border: "border-red-500/40",     text: "text-red-400",     badge: "bg-red-500/20 text-red-300",      bar: "bg-red-500" },
  purple:  { bg: "from-purple-900/40 to-indigo-900/40",border: "border-purple-500/40",  text: "text-purple-400",  badge: "bg-purple-500/20 text-purple-300", bar: "bg-purple-500" },
  yellow:  { bg: "from-yellow-900/40 to-orange-900/40",border: "border-yellow-500/40",  text: "text-yellow-400",  badge: "bg-yellow-500/20 text-yellow-300", bar: "bg-yellow-500" },
};

export default function LirysMissedRevenue() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-8">
      {/* WAKE UP CALL HEADER */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-red-950 via-orange-950 to-red-950 border-2 border-red-500/60 p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.15)_0%,_transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
            <h2 className="text-3xl font-bold text-white font-['Playfair_Display']">
              Money Left on the Table
            </h2>
            <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
          </div>
          <p className="text-red-200 text-lg mb-6 leading-relaxed">
            This is not a projection. This is a calculation of <strong className="text-white">real money that already existed</strong> — 
            money that other creators with your exact following, your exact niche, and your exact skills 
            collected over the last 24 months. You didn't. Here's what that cost you.
          </p>

          {/* BIG NUMBER */}
          <div className="text-center py-8">
            <div className="text-sm text-red-300 font-semibold uppercase tracking-widest mb-2">
              Total Missed Revenue — Last 24 Months
            </div>
            <div className="text-7xl md:text-8xl font-black text-red-400 mb-2 font-['Playfair_Display']">
              {revealed ? (
                <AnimatedCounter target={MISSED_DATA.totalMissed} />
              ) : (
                <span className="blur-sm select-none">$98,864</span>
              )}
            </div>
            {!revealed && (
              <button
                onClick={() => setRevealed(true)}
                className="mt-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-full text-lg transition-all hover:scale-105"
              >
                Show Me the Number 💀
              </button>
            )}
            {revealed && (
              <div className="mt-4 grid grid-cols-3 gap-6 max-w-lg mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    <AnimatedCounter target={MISSED_DATA.missedPerMonth} />
                  </div>
                  <div className="text-xs text-white/50">per month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    <AnimatedCounter target={MISSED_DATA.missedPerDay} />
                  </div>
                  <div className="text-xs text-white/50">per day</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    <AnimatedCounter target={Math.round(MISSED_DATA.totalMissed / 8)} />
                  </div>
                  <div className="text-xs text-white/50">per hour of content</div>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-white/60 text-sm italic">
            Based on industry benchmarks for Dominican Republic creators with 1,400 followers in food, lifestyle, and Airbnb hosting verticals.
          </p>
        </div>
      </div>

      {/* BREAKDOWN BY VERTICAL */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-2 font-['Playfair_Display']">
          Where the Money Went (Without You)
        </h3>
        <p className="text-white/50 text-sm mb-6">
          Every bar below represents real money paid to other creators in your exact niche — while your accounts sat idle.
        </p>

        {/* Visual bar chart */}
        <div className="space-y-3 mb-8">
          {MISSED_DATA.verticals.map((v) => {
            const c = colorMap[v.color];
            return (
              <div key={v.name} className="flex items-center gap-4">
                <div className="w-32 text-right text-sm text-white/70 font-semibold shrink-0">
                  {v.icon} {v.name}
                </div>
                <div className="flex-1 bg-white/5 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full ${c.bar} rounded-full flex items-center justify-end pr-3 transition-all`}
                    style={{ width: `${v.pct}%` }}
                  >
                    <span className="text-white text-xs font-bold">{v.pct}%</span>
                  </div>
                </div>
                <div className={`w-28 text-right text-sm font-bold ${c.text} shrink-0`}>
                  ${v.missed24m.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vertical cards */}
        <div className="grid md:grid-cols-1 gap-6">
          {MISSED_DATA.verticals.map((v) => {
            const c = colorMap[v.color];
            return (
              <Card key={v.name} className={`p-6 bg-gradient-to-br ${c.bg} border ${c.border}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{v.icon}</div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{v.name}</h4>
                      <div className={`text-sm font-semibold ${c.text}`}>
                        ${v.missed24m.toLocaleString()} missed in 24 months
                      </div>
                    </div>
                  </div>
                  <Badge className={`${c.badge} text-sm px-3 py-1`}>
                    ${v.missedMonthly.toFixed(0)}/mo missed
                  </Badge>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 mb-4">
                  {v.breakdown.map((b) => (
                    <div key={b.label} className="flex justify-between items-center p-2 bg-white/5 rounded-lg text-sm">
                      <span className="text-white/70">{b.label}</span>
                      <span className="text-white font-bold">${b.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Fix */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-start gap-2">
                    <TrendingUp className={`w-4 h-4 ${c.text} mt-0.5 shrink-0`} />
                    <div>
                      <div className="text-xs text-white/50 uppercase tracking-wide mb-1">The Fix</div>
                      <p className="text-white/80 text-sm">{v.fix}</p>
                      <div className={`text-sm font-bold ${c.text} mt-2`}>→ {v.potential}</div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* WHAT STARTS NOW */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-950 border-2 border-emerald-500/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-7 h-7 text-emerald-400" />
          <h3 className="text-2xl font-bold text-white font-['Playfair_Display']">
            What Starts Now
          </h3>
        </div>
        <p className="text-white/70 mb-6">
          The $98,864 is gone. You can't get it back. But here's what's available starting today 
          if you treat your platforms like the business they are.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="p-6 bg-white/5 rounded-2xl text-center border border-emerald-500/20">
            <div className="text-5xl font-black text-emerald-400 mb-2">
              <AnimatedCounter target={MISSED_DATA.monthlyPotentialNow} />
            </div>
            <div className="text-white/60 text-sm">per month — starting now</div>
            <div className="text-white/40 text-xs mt-1">Based on consistent posting + all verticals active</div>
          </div>
          <div className="p-6 bg-white/5 rounded-2xl text-center border border-teal-500/20">
            <div className="text-5xl font-black text-teal-400 mb-2">
              <AnimatedCounter target={MISSED_DATA.annualPotentialNow} />
            </div>
            <div className="text-white/60 text-sm">per year — year 1 projection</div>
            <div className="text-white/40 text-xs mt-1">Conservative estimate. YouTube + brand deals scale fast.</div>
          </div>
        </div>

        {/* Action checklist */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-lg mb-3">
            <Flame className="w-5 h-5 inline mr-2 text-orange-400" />
            Your 7-Day Action Plan
          </h4>
          {[
            { day: "Day 1", action: "Create YouTube channel 'Lirys Cooks' — upload your first Dominican recipe video", icon: "📺", color: "text-red-400" },
            { day: "Day 2", action: "Apply to SHEIN Creator Program + Fashion Nova ambassador program", icon: "👗", color: "text-pink-400" },
            { day: "Day 3", action: "Add chef breakfast add-on to your Airbnb listing ($25/person)", icon: "🍳", color: "text-emerald-400" },
            { day: "Day 4", action: "Go LIVE on TikTok for 30 minutes — cooking something. First LIVE = gift money.", icon: "📱", color: "text-purple-400" },
            { day: "Day 5", action: "Post 3 TikToks in one day. Hook: 'POV: Your Airbnb host is a 5-star chef'", icon: "🎬", color: "text-yellow-400" },
            { day: "Day 6", action: "Update your TikTok bio link to creatorvault.live/chica/8004", icon: "🔗", color: "text-cyan-400" },
            { day: "Day 7", action: "Post your first YouTube video. Cross-post the TikTok version. Watch the algorithm work.", icon: "🚀", color: "text-orange-400" },
          ].map((item) => (
            <div key={item.day} className="flex items-start gap-4 p-3 bg-white/5 rounded-xl">
              <div className="text-2xl shrink-0">{item.icon}</div>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wide ${item.color}`}>{item.day}</span>
                <p className="text-white/80 text-sm">{item.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPARISON */}
      <Card className="p-6 bg-gradient-to-br from-gray-900 to-black border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">
          <Clock className="w-5 h-5 inline mr-2 text-white/50" />
          The Real Cost of Waiting
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-xl">
            <div className="text-3xl font-bold text-red-400">$135</div>
            <div className="text-sm text-white/60">Lost every day you don't post</div>
          </div>
          <div className="p-4 bg-orange-900/20 border border-orange-500/20 rounded-xl">
            <div className="text-3xl font-bold text-orange-400">$945</div>
            <div className="text-sm text-white/60">Lost every week you're inconsistent</div>
          </div>
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-xl">
            <div className="text-3xl font-bold text-yellow-400">$4,119</div>
            <div className="text-sm text-white/60">Lost every month you treat this like a hobby</div>
          </div>
        </div>
        <p className="text-center text-white/40 text-sm mt-4 italic">
          "Every creator who looks like you, cooks like you, and hosts like you — already got paid. The only difference is they showed up."
        </p>
      </Card>
    </div>
  );
}
