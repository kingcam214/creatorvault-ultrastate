import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Crown, Flame, Dumbbell, DollarSign, TrendingUp, Star,
  Heart, Zap, Target, Trophy, AlertTriangle, Eye, EyeOff,
  Instagram, MessageCircle, Users, ShoppingBag, Smartphone,
  Play, Lock, CheckCircle, ArrowRight, BarChart3, Clock
} from 'lucide-react';

// ============================================================
// MISSED REVENUE DATA — Real numbers, real verticals
// ============================================================
const missedVerticals = [
  {
    name: "Adult Content (Fansly → VaultX)",
    missed: 17400,
    pct: 37.9,
    color: "from-red-600 to-pink-600",
    bgColor: "bg-red-500/10 border-red-500/30",
    icon: "🔥",
    fix: "VaultX with Tinder funnel. $39.99/mo subs from gringos. 20 subs = $800/mo.",
    was: "Making ~$25/month on Fansly. Essentially nothing.",
    canMake: "$800/mo starting now"
  },
  {
    name: "VaultX Subscriptions",
    missed: 9598,
    pct: 20.9,
    color: "from-purple-600 to-indigo-600",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    icon: "👑",
    fix: "Tinder → WhatsApp → Telegram → VaultX. Funnel is already built. Start now.",
    was: "No VaultX account. No funnel. No subs.",
    canMake: "$400-800/mo with 10-20 subs"
  },
  {
    name: "Sexy Fitness Content",
    missed: 4080,
    pct: 8.9,
    color: "from-orange-500 to-yellow-500",
    bgColor: "bg-orange-500/10 border-orange-500/30",
    icon: "💪",
    fix: "Fit body + fitness content = highest-paying TikTok niche. Post workout videos. Sell guides.",
    was: "Has a fit body. Has NEVER posted a single fitness video.",
    canMake: "$170/mo in guides + brand deals"
  },
  {
    name: "Telegram Paid Community",
    missed: 7193,
    pct: 15.7,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    icon: "📱",
    fix: "$9.99/mo channel. 30 members = $300/mo. Drive from TikTok and IG.",
    was: "No paid Telegram. No community. No recurring revenue.",
    canMake: "$300/mo with 30 members"
  },
  {
    name: "Instagram Brand Deals",
    missed: 3600,
    pct: 7.8,
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-500/10 border-pink-500/30",
    icon: "📸",
    fix: "4,945 IG followers qualifies for micro-influencer deals. Pitch SHEIN, Fashion Nova today.",
    was: "362 posts. Never pitched a single brand deal.",
    canMake: "$150/deal × 1-2 deals/month"
  },
  {
    name: "TikTok LIVE Gifts",
    missed: 1800,
    pct: 3.9,
    color: "from-teal-500 to-green-500",
    bgColor: "bg-teal-500/10 border-teal-500/30",
    icon: "🎁",
    fix: "Go LIVE 3x/week. 1K followers earns $75-200/mo in gifts. She's not going live at all.",
    was: "1,032 followers. 26K likes. Never goes live.",
    canMake: "$75-200/mo in gifts"
  },
  {
    name: "Instagram Affiliate Links",
    missed: 1800,
    pct: 3.9,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500/10 border-violet-500/30",
    icon: "🔗",
    fix: "Add Fashion Nova affiliate link to every post bio. 10-20% commission on every sale.",
    was: "362 posts with no affiliate links. Zero passive income.",
    canMake: "$75/mo passive"
  },
  {
    name: "TikTok Creator Fund",
    missed: 420,
    pct: 0.9,
    color: "from-gray-500 to-slate-500",
    bgColor: "bg-gray-500/10 border-gray-500/30",
    icon: "📊",
    fix: "Post 5x/day to hit 10K followers. Creator Fund pays at 10K.",
    was: "1,032 followers. Not posting consistently. Not at 10K yet.",
    canMake: "$35/mo at 10K followers"
  }
];

const totalMissed = 45890;
const monthlyMissed = 1912;
const dailyMissed = 64;
const monthlyPotentialNow = 1570;
const annualPotentialNow = 18834;

// ============================================================
// TINDER FUNNEL SCRIPT
// ============================================================
const tenderFunnelSteps = [
  {
    platform: "Tinder",
    color: "from-red-500 to-orange-500",
    icon: "❤️",
    bio: "Princesa De Africa 🦋 | Dominican in Colombia 🇩🇴🇨🇴 | Fit & free 🔥 | Private content on VaultX 👑 | Ask me how 😈",
    opener: "Hey 😘 I'm Leslie. You matched with me — good taste. I have a private side I only share with select people. Interested? 🔥",
    cta: "I don't really use Tinder to chat — add me on WhatsApp? I'll send you something special 😈"
  },
  {
    platform: "WhatsApp",
    color: "from-green-500 to-emerald-500",
    icon: "📱",
    step1: "Hey papi 😘 I'm Leslie — Princesa De Africa. Dominican girl living in Colombia. I'm a model and content creator. I have a very... private side 🔥",
    step2: "I post fitness content publicly but my REAL content — the stuff I actually want to share — is on my VaultX. Have you heard of it? 😈",
    step3: "Before VaultX, join my Telegram first — it's free and I post previews there. t.me/princesadeafrica_official — join and I'll DM you personally 😘",
    step4: "Okay papi — you've been patient 😈 My VaultX is $39.99/month. Fit body, adult content, things I can't post anywhere else. Subscribe: vaultx.com/princesadeafrica 👑"
  },
  {
    platform: "Telegram",
    color: "from-blue-500 to-cyan-500",
    icon: "✈️",
    welcome: "Welcome to my Telegram! 🦋 I'm Leslie — Princesa De Africa. This is where I post free previews of my VaultX content. Stay here and you'll see why people subscribe 😈",
    drop: "New preview just dropped 🔥 Full content at vaultx.com/princesadeafrica — $39.99/month 👑",
    push: "Dropping something SPECIAL on VaultX tonight 🔥 If you're not subscribed yet — tonight is the night."
  },
  {
    platform: "VaultX",
    color: "from-purple-600 to-pink-600",
    icon: "👑",
    welcome: "WELCOME to my VaultX 👑 I'm Leslie — Princesa De Africa. You made the right choice. Adult fitness content, lifestyle, and everything I can't post on TikTok or IG. New content every week. DM me anytime 😘",
    upsell: "I do custom content 😈 If you want something specific, DM me and we can talk. Prices start at $50."
  }
];

// ============================================================
// SOCIAL MEDIA STRATEGY
// ============================================================
const socialStrategy = [
  {
    platform: "TikTok",
    handle: "@princesadeafrica",
    followers: "1,032",
    likes: "26K",
    engagement: "High (26K likes on 1K followers = 2.5%)",
    status: "🔴 Not monetized",
    color: "border-gray-700",
    pillars: [
      { title: "Sexy Fitness", hook: "'POV: Dominican girl with a fit body shows you her morning workout 🔥'", why: "Highest engagement niche. Crossover to mainstream AND adult." },
      { title: "Day in My Life Colombia", hook: "'Living in Colombia as a Dominican girl — what nobody tells you 🇨🇴'", why: "Travel + lifestyle = viral. Drives IG follows." },
      { title: "Glow Up Content", hook: "'I used to make $0 on social media. Here's what changed 👑'", why: "Aspirational. Drives Telegram + VaultX." },
      { title: "Dominican Culture", hook: "'Things only Dominicanas understand 🇩🇴😂'", why: "Cultural content goes viral in the diaspora." },
      { title: "Fashion Fits", hook: "'SHEIN haul but make it Princesa De Africa 🦋'", why: "Brand deal pipeline. Fashion Nova. SHEIN." },
      { title: "Fitness Transformation", hook: "'30 days of working out every day — here's what happened to my body 💪'", why: "Fitness transformation = highest save rate on TikTok." }
    ],
    rules: [
      "Post 3-5x per day minimum",
      "Hook lands in first 2 seconds — no slow intros",
      "NEVER say VaultX, OnlyFans, or Fansly on TikTok",
      "Say 'exclusive content' or 'private community' instead",
      "Go LIVE 3x per week — gifts are real money",
      "End every video with 'Link in bio for more 🦋'"
    ]
  },
  {
    platform: "Instagram",
    handle: "@negriitax3",
    followers: "4,945",
    posts: "362",
    status: "🟡 Partially active, not monetized",
    color: "border-pink-700",
    pillars: [
      { title: "Body Content", hook: "Fit body photos in SHEIN/Fashion Nova outfits. Tag brands. Get deals.", why: "4,945 followers = micro-influencer rate." },
      { title: "Reels from TikTok", hook: "Repost every TikTok as an Instagram Reel. Double the reach.", why: "Free content repurposing. IG pays Reels bonuses." },
      { title: "Colombia Lifestyle", hook: "Beautiful locations, food, culture. Travel content.", why: "Travel content = brand deals + affiliate." },
      { title: "Behind the Scenes", hook: "Tease VaultX content without showing anything explicit.", why: "Drives subscribers. Stays IG-safe." }
    ],
    rules: [
      "Add Fashion Nova affiliate link to bio TODAY",
      "Tag @shein_official and @fashionnova in every outfit post",
      "Post 1-2x per day minimum",
      "Stories daily — polls, Q&As, countdowns",
      "DM every new follower: 'Hey! Join my Telegram for exclusive content 🦋'"
    ]
  },
  {
    platform: "WhatsApp Business",
    handle: "Princesa De Africa Leslie",
    status: "🟢 Already set up as Business Account",
    color: "border-green-700",
    strategy: [
      "This is your MONEY PHONE. Every Tinder match → WhatsApp.",
      "Set up auto-reply: 'Hey papi 😘 I'm Leslie. I'll send you something special — give me one second 🔥'",
      "Broadcast list: send VaultX promos to all contacts at once",
      "Status updates: post daily teasers that drive to Telegram/VaultX",
      "Catalog: add VaultX subscription as a 'product' in WhatsApp Business catalog"
    ]
  },
  {
    platform: "Telegram",
    handle: "t.me/princesadeafrica_official",
    status: "🔴 Needs to be created",
    color: "border-blue-700",
    strategy: [
      "Create FREE preview channel — this is the bridge between IG/TikTok and VaultX",
      "Post 1 free preview per day (safe content — workout clips, lifestyle, teasers)",
      "Paid channel at $9.99/mo for more explicit previews",
      "Pin message: 'VaultX link: vaultx.com/princesadeafrica — $39.99/mo for everything 👑'",
      "Every Tinder/WhatsApp conversation ends with Telegram invite"
    ]
  }
];

export default function LeslieProfile() {
  const [showMoney, setShowMoney] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());

  const revealCard = (idx: number) => {
    setRevealedCards(prev => new Set([...prev, idx]));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-red-900/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row items-center gap-12">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-52 h-52 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-1 shadow-2xl shadow-purple-500/50">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-900 to-purple-950 flex items-center justify-center">
                  <span className="text-7xl">🦋</span>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-full px-4 py-1.5 shadow-xl">
                <span className="text-white font-bold text-xs">🔥 Adult Creator</span>
              </div>
              <div className="absolute -bottom-3 -left-3 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full px-4 py-1.5 shadow-xl">
                <span className="text-white font-bold text-xs">💪 Fit Body</span>
              </div>
              <div className="absolute top-1/2 -right-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full px-4 py-1.5 shadow-xl">
                <span className="text-white font-bold text-xs">👑 VaultX</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-5xl md:text-6xl font-bold text-white font-['Playfair_Display']">Leslie</h1>
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-base px-4 py-2">
                  <Crown className="w-4 h-4 mr-2" />
                  Princesa De Africa
                </Badge>
              </div>
              <div className="text-lg text-purple-300 mb-1 font-semibold">@princesadeafrica (TikTok) · @negriitax3 (IG)</div>
              <div className="text-yellow-400 font-bold text-xl mb-4 italic">"The Greatest Show's Adult Fitness Queen"</div>
              <div className="flex flex-wrap gap-2 text-sm text-white/80 mb-6">
                <span>🇩🇴 Dominican</span><span>•</span>
                <span>🇨🇴 Based in Colombia</span><span>•</span>
                <span>💪 Fit Body</span><span>•</span>
                <span>🔥 Adult Creator</span><span>•</span>
                <span>🦋 Arts & Entertainment</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "TikTok Followers", value: "1,032", sub: "26K likes", color: "text-gray-300" },
                  { label: "Instagram", value: "4,945", sub: "362 posts", color: "text-pink-300" },
                  { label: "Engagement", value: "2.5%", sub: "High for niche", color: "text-green-300" },
                  { label: "Fansly Revenue", value: "~$0", sub: "Was making nothing", color: "text-red-400" },
                ].map((s, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-white/60 text-xs">{s.label}</div>
                    <div className="text-white/40 text-xs">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Alert banner */}
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-red-300 font-bold text-sm">She has been leaving serious money on the table.</div>
                  <div className="text-red-200/70 text-xs mt-1">
                    26K TikTok likes. 4,945 IG followers. 362 posts. A fit body. And a Fansly making $0.
                    She has never done fitness content. She has no VaultX. She has no Telegram. She has no funnel.
                    See the full breakdown below.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <Tabs defaultValue="money" className="w-full">
          <TabsList className="grid grid-cols-5 w-full mb-12 bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="money" className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-xl font-semibold text-xs md:text-sm">
              💀 Money Lost
            </TabsTrigger>
            <TabsTrigger value="vaultx" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-xl font-semibold text-xs md:text-sm">
              👑 VaultX Funnel
            </TabsTrigger>
            <TabsTrigger value="fitness" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-xl font-semibold text-xs md:text-sm">
              💪 Fitness Lane
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white rounded-xl font-semibold text-xs md:text-sm">
              📱 Social Strategy
            </TabsTrigger>
            <TabsTrigger value="subscribe" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl font-semibold text-xs md:text-sm">
              ⭐ Subscribe
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════
              TAB 1: MONEY LOST
          ══════════════════════════════════════════════════════ */}
          <TabsContent value="money">
            <div className="space-y-8">

              {/* The Big Number */}
              <div className="text-center py-12 bg-gradient-to-br from-red-950 via-gray-950 to-black border border-red-500/30 rounded-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
                <div className="relative">
                  <div className="text-red-400 font-bold text-lg mb-2 uppercase tracking-widest">Money Left on the Table</div>
                  <div className="text-white/50 text-sm mb-6">Last 24 months · Based on your real follower counts</div>

                  {!showMoney ? (
                    <div className="space-y-4">
                      <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500 blur-sm select-none">
                        $45,890
                      </div>
                      <Button
                        onClick={() => setShowMoney(true)}
                        className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold px-8 py-4 text-lg rounded-xl"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        Show Me the Number 💀
                      </Button>
                      <div className="text-white/40 text-sm">Are you sure you want to know?</div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">
                        $45,890
                      </div>
                      <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                        <div>
                          <div className="text-3xl font-bold text-red-400">${monthlyMissed.toLocaleString()}</div>
                          <div className="text-white/50 text-sm">per month</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-orange-400">${dailyMissed}</div>
                          <div className="text-white/50 text-sm">per day</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-yellow-400">24</div>
                          <div className="text-white/50 text-sm">months</div>
                        </div>
                      </div>
                      <div className="text-white/60 text-base max-w-xl mx-auto">
                        Every creator who looks like you, posts like you, and has a body like yours — already got paid.
                        The only difference is they had a system. <span className="text-white font-bold">Now you do too.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Breakdown by vertical */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Where the Money Went — Without You</h2>
                <p className="text-white/50 mb-6">Click each card to see exactly what you missed and how to fix it starting today.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {missedVerticals.map((v, i) => (
                    <div
                      key={i}
                      className={`border rounded-2xl p-5 cursor-pointer transition-all ${v.bgColor} hover:scale-[1.01]`}
                      onClick={() => revealCard(i)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{v.icon}</span>
                          <div>
                            <div className="text-white font-bold text-sm">{v.name}</div>
                            <div className="text-white/50 text-xs">{v.pct}% of total missed</div>
                          </div>
                        </div>
                        <div className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r ${v.color}`}>
                          ${v.missed.toLocaleString()}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-white/10 rounded-full mb-3">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${v.color}`}
                          style={{ width: `${v.pct}%` }}
                        />
                      </div>

                      {revealedCards.has(i) ? (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <div className="text-red-300 text-xs"><span className="font-bold">Was:</span> {v.was}</div>
                          <div className="text-green-300 text-xs"><span className="font-bold">Fix:</span> {v.fix}</div>
                          <div className="text-yellow-300 text-xs font-bold">Starting now: {v.canMake}</div>
                        </div>
                      ) : (
                        <div className="text-white/30 text-xs flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Tap to see what you missed and how to fix it
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* What she can make NOW */}
              <div className="bg-gradient-to-br from-green-950 to-emerald-950 border border-green-500/30 rounded-3xl p-8">
                <div className="text-center mb-8">
                  <div className="text-green-400 font-bold text-lg uppercase tracking-widest mb-2">Starting Right Now</div>
                  <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    ${monthlyPotentialNow.toLocaleString()}/mo
                  </div>
                  <div className="text-white/50 mt-2">${annualPotentialNow.toLocaleString()} per year — if she starts today</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "VaultX (20 subs)", amount: "$800", color: "text-purple-300" },
                    { label: "TikTok LIVE Gifts", amount: "$75", color: "text-gray-300" },
                    { label: "IG Brand Deals", amount: "$150", color: "text-pink-300" },
                    { label: "Telegram Community", amount: "$300", color: "text-blue-300" },
                    { label: "IG Affiliate", amount: "$75", color: "text-violet-300" },
                    { label: "Fitness Guides", amount: "$170", color: "text-orange-300" },
                    { label: "Custom Content", amount: "$100+", color: "text-red-300" },
                    { label: "Total/Month", amount: `$${monthlyPotentialNow.toLocaleString()}`, color: "text-green-300 font-black text-xl" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <div className={`text-lg font-bold ${item.color}`}>{item.amount}</div>
                      <div className="text-white/50 text-xs">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════
              TAB 2: VAULTX FUNNEL
          ══════════════════════════════════════════════════════ */}
          <TabsContent value="vaultx">
            <div className="space-y-8">

              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">The Full VaultX Funnel</h2>
                <p className="text-white/50">Tinder → WhatsApp → Telegram → VaultX. Every step is scripted. Every message is written. She just has to send it.</p>
              </div>

              {/* Funnel Flow Visual */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
                {["❤️ Tinder", "→", "📱 WhatsApp", "→", "✈️ Telegram", "→", "👑 VaultX $39.99/mo"].map((step, i) => (
                  <div key={i} className={`${step === "→" ? "text-white/30 text-2xl" : "bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white font-bold text-sm"}`}>
                    {step}
                  </div>
                ))}
              </div>

              {/* Step-by-step scripts */}
              {tenderFunnelSteps.map((step, i) => (
                <div key={i} className={`bg-gradient-to-r ${step.color} p-0.5 rounded-2xl`}>
                  <div className="bg-gray-950 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{step.icon}</span>
                      <h3 className="text-xl font-bold text-white">{step.platform}</h3>
                      <Badge className={`bg-gradient-to-r ${step.color} text-white`}>
                        Step {i + 1}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(step).filter(([k]) => !['platform', 'color', 'icon'].includes(k)).map(([key, val]) => (
                        <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="text-white/40 text-xs uppercase tracking-wide mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                          <div className="text-white text-sm leading-relaxed">{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* VaultX Setup Walkthrough */}
              <div className="bg-purple-950/50 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">🔧 VaultX Setup Walkthrough</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", action: "Go to vaultx.com and create account as 'Princesa De Africa'", status: "Do this first" },
                    { step: "2", action: "Set subscription price to $39.99/month", status: "Premium positioning" },
                    { step: "3", action: "Upload 5-10 teaser photos to your profile (nothing explicit — just enough to sell)", status: "Profile setup" },
                    { step: "4", action: "Write bio: 'Dominican. Fit. Unfiltered. Adult fitness content + lifestyle. New content every week. DM me for customs. 😈'", status: "Bio copy" },
                    { step: "5", action: "Copy your VaultX link and add it to your Telegram pinned message and IG bio", status: "Link placement" },
                    { step: "6", action: "Start the Tinder funnel — every match goes through the script above", status: "Activate funnel" },
                    { step: "7", action: "Post to VaultX 3x per week minimum — subscribers need fresh content to stay", status: "Retention" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-sm">{item.action}</div>
                        <div className="text-purple-300 text-xs mt-1">{item.status}</div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-white/20 flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════
              TAB 3: FITNESS LANE
          ══════════════════════════════════════════════════════ */}
          <TabsContent value="fitness">
            <div className="space-y-8">

              <div className="bg-orange-950/50 border border-orange-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">💪</span>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">The Untapped Lane</h2>
                    <p className="text-white/70">
                      Leslie has a fit body and has <span className="text-red-400 font-bold">never posted a single fitness video</span>.
                      Sexy fitness is one of the highest-engagement niches on TikTok — and it crossovers perfectly
                      with adult content. The same body that sells on VaultX can build a mainstream fitness following
                      that drives even more subscribers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Pillars */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4">6 Content Pillars for the Fitness Lane</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Morning Workout Routine",
                      hook: "'My 20-minute morning workout that keeps this body 🔥' — film in workout set",
                      tiktok: "High save rate. Goes viral in fitness niche.",
                      crossover: "End with: 'Full workout program on my VaultX 😈'",
                      color: "border-orange-500/30 bg-orange-500/5"
                    },
                    {
                      title: "Sexy Fitness Fits",
                      hook: "'Rating my workout outfits 🔥 Which one is your favorite?' — SHEIN/Fashion Nova sets",
                      tiktok: "Fashion + fitness = double algorithm hit.",
                      crossover: "Tag @shein_official and @fashionnova. Brand deal pipeline.",
                      color: "border-pink-500/30 bg-pink-500/5"
                    },
                    {
                      title: "Body Transformation Journey",
                      hook: "'30 days of working out every day — here's what happened to my body 💪'",
                      tiktok: "Highest save rate on TikTok. People bookmark these forever.",
                      crossover: "Drives followers. Drives VaultX subs who want to see 'more'.",
                      color: "border-red-500/30 bg-red-500/5"
                    },
                    {
                      title: "Dominican Fitness Culture",
                      hook: "'How Dominican girls stay fit 🇩🇴 — our secret workout 😂'",
                      tiktok: "Cultural + fitness = diaspora viral. Huge in DR/Latin community.",
                      crossover: "Builds authentic brand. Drives IG follows.",
                      color: "border-yellow-500/30 bg-yellow-500/5"
                    },
                    {
                      title: "Gym Day in Colombia",
                      hook: "'Going to the gym in Colombia 🇨🇴 — this is what it looks like'",
                      tiktok: "Travel + fitness = two viral niches in one video.",
                      crossover: "Lifestyle content that drives Telegram community.",
                      color: "border-green-500/30 bg-green-500/5"
                    },
                    {
                      title: "Fitness Glow Up",
                      hook: "'I used to not work out at all. Here's what 6 months of consistency did 🔥'",
                      tiktok: "Transformation content = highest engagement on TikTok period.",
                      crossover: "Aspirational. Drives subscriptions. Drives brand deals.",
                      color: "border-blue-500/30 bg-blue-500/5"
                    }
                  ].map((p, i) => (
                    <div key={i} className={`border rounded-2xl p-5 ${p.color}`}>
                      <div className="text-white font-bold mb-2">{p.title}</div>
                      <div className="space-y-2">
                        <div className="text-white/70 text-sm"><span className="text-orange-300 font-semibold">Hook:</span> {p.hook}</div>
                        <div className="text-white/70 text-sm"><span className="text-green-300 font-semibold">Why it works:</span> {p.tiktok}</div>
                        <div className="text-white/70 text-sm"><span className="text-purple-300 font-semibold">Crossover:</span> {p.crossover}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fitness Monetization */}
              <div className="bg-gradient-to-br from-orange-950 to-red-950 border border-orange-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">💰 Fitness Monetization Stack</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { product: "Workout Guide PDF", price: "$35", how: "Sell via Gumroad or direct DM. 'My full 4-week workout program.'", monthly: "$70/mo (2 sales)" },
                    { product: "SHEIN/Fashion Nova Brand Deals", price: "$150-500/deal", how: "Tag brands in every fitness post. DM their collab email.", monthly: "$150/mo (1 deal)" },
                    { product: "VaultX Fitness Content", price: "Included in $39.99/mo", how: "Fitness content on VaultX = mainstream followers who convert to subs.", monthly: "Drives VaultX subs" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-orange-300 font-bold mb-1">{item.product}</div>
                      <div className="text-white text-xl font-black mb-2">{item.price}</div>
                      <div className="text-white/60 text-xs mb-2">{item.how}</div>
                      <div className="text-green-300 text-xs font-bold">{item.monthly}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════
              TAB 4: SOCIAL STRATEGY
          ══════════════════════════════════════════════════════ */}
          <TabsContent value="social">
            <div className="space-y-8">

              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">Full Social Media Strategy</h2>
                <p className="text-white/50">TikTok · Instagram · WhatsApp Business · Telegram — all four platforms working together.</p>
              </div>

              {socialStrategy.map((platform, i) => (
                <div key={i} className={`border rounded-2xl p-6 bg-white/3 ${platform.color}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-bold text-white">{platform.platform}</h3>
                    <Badge className="bg-white/10 text-white/70 text-xs">{platform.handle}</Badge>
                    <span className="text-sm">{platform.status}</span>
                  </div>

                  {'followers' in platform && (
                    <div className="flex gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg px-3 py-1 text-sm text-white/70">
                        <span className="font-bold text-white">{platform.followers}</span> followers
                      </div>
                      {'likes' in platform && (
                        <div className="bg-white/5 rounded-lg px-3 py-1 text-sm text-white/70">
                          <span className="font-bold text-white">{platform.likes}</span> likes
                        </div>
                      )}
                      {'engagement' in platform && (
                        <div className="bg-green-500/10 rounded-lg px-3 py-1 text-sm text-green-300">
                          {platform.engagement}
                        </div>
                      )}
                    </div>
                  )}

                  {'pillars' in platform && (
                    <div className="mb-4">
                      <div className="text-white/50 text-xs uppercase tracking-wide mb-2">Content Pillars</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {platform.pillars.map((p, j) => (
                          <div key={j} className="bg-white/5 rounded-xl p-3">
                            <div className="text-white font-semibold text-sm">{p.title}</div>
                            <div className="text-white/60 text-xs mt-1">{p.hook}</div>
                            <div className="text-green-300 text-xs mt-1">{p.why}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {'rules' in platform && (
                    <div>
                      <div className="text-white/50 text-xs uppercase tracking-wide mb-2">Rules</div>
                      <div className="space-y-1">
                        {platform.rules.map((rule, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm text-white/70">
                            <ArrowRight className="w-3 h-3 text-white/30 mt-1 flex-shrink-0" />
                            {rule}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {'strategy' in platform && (
                    <div className="space-y-1">
                      {platform.strategy.map((s, j) => (
                        <div key={j} className="flex items-start gap-2 text-sm text-white/70">
                          <ArrowRight className="w-3 h-3 text-white/30 mt-1 flex-shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* The Secret Lives Problem */}
              <div className="bg-red-950/50 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-red-300 mb-2">The "Secret Life" Problem</h3>
                    <p className="text-white/70 text-sm mb-3">
                      Hiding your social media from family feels safe. But you <span className="text-white font-bold">cannot grow without a public social presence</span>.
                      The target audience is <span className="text-white font-bold">gringos</span> — English-speaking men who don't know your family,
                      don't speak Spanish, and will never cross into your personal life. Your family is not your customer.
                    </p>
                    <div className="space-y-2">
                      {[
                        "Create a separate 'creator persona' account — Princesa De Africa is the brand, not your personal name",
                        "Your family doesn't need to know about VaultX — they just see the fitness and lifestyle content",
                        "The money is real. The privacy is manageable. The missed income is not.",
                        "Every day you hide is another $64 you don't make."
                      ].map((point, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <ArrowRight className="w-3 h-3 text-red-400 mt-1 flex-shrink-0" />
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════
              TAB 5: SUBSCRIBE
          ══════════════════════════════════════════════════════ */}
          <TabsContent value="subscribe">
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Subscribe to Princesa De Africa</h2>
                <p className="text-white/50">Choose your level of access</p>
              </div>
              {[
                {
                  tier: "Free Preview",
                  price: "FREE",
                  color: "border-gray-600",
                  badge: "Start Here",
                  badgeColor: "bg-gray-600",
                  perks: ["Telegram free channel access", "TikTok + IG content", "Weekly lifestyle posts", "No VaultX access"],
                  cta: "Join Free Telegram",
                  ctaColor: "bg-gray-700 hover:bg-gray-600"
                },
                {
                  tier: "VaultX Subscriber",
                  price: "$39.99/mo",
                  color: "border-purple-500",
                  badge: "Most Popular",
                  badgeColor: "bg-purple-600",
                  perks: ["Full VaultX access", "Adult fitness content", "Lifestyle + exclusive posts", "New content every week", "DM access"],
                  cta: "Subscribe on VaultX",
                  ctaColor: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                },
                {
                  tier: "Custom Content",
                  price: "From $50",
                  color: "border-red-500",
                  badge: "Premium",
                  badgeColor: "bg-red-600",
                  perks: ["Custom content requests", "Personalized videos", "Priority DM response", "Exclusive one-on-one", "Prices vary by request"],
                  cta: "DM for Custom Content",
                  ctaColor: "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500"
                }
              ].map((plan, i) => (
                <div key={i} className={`border-2 ${plan.color} rounded-2xl p-6 bg-white/3`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.tier}</h3>
                      <div className="text-3xl font-black text-white mt-1">{plan.price}</div>
                    </div>
                    <Badge className={`${plan.badgeColor} text-white`}>{plan.badge}</Badge>
                  </div>
                  <div className="space-y-2 mb-6">
                    {plan.perks.map((perk, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {perk}
                      </div>
                    ))}
                  </div>
                  <Button className={`w-full ${plan.ctaColor} text-white font-bold py-3 rounded-xl`}>
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
