/**
 * ViralOptimizer.tsx — Dual-Mode Content Virality Engine
 * Adult Mode: PPV conversion, teaser compliance, desire-grade analysis, shadowban avoidance
 * SFW Mode: Algorithm retention, CTR optimization, engagement hooks, trend scoring
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreatorMode, CreatorModeSwitcher } from "@/contexts/CreatorModeContext";
import {
  Flame, TrendingUp, Target, Zap, DollarSign, Shield,
  BarChart2, Sparkles, CheckCircle2, AlertCircle, Clock, Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADULT_PLATFORMS = [
  { value: "onlyfans", label: "OnlyFans", icon: "🔒", note: "PPV + Subscription" },
  { value: "fansly", label: "Fansly", icon: "💜", note: "Multi-tier content" },
  { value: "twitter", label: "Twitter / X", icon: "X", note: "Adult-friendly, teaser funnel" },
  { value: "reddit", label: "Reddit", icon: "🔴", note: "NSFW subreddits, free funnel" },
  { value: "tiktok", label: "TikTok (SFW Funnel)", icon: "🎵", note: "Teaser only — drives to OF/Fansly" },
  { value: "instagram", label: "Instagram (SFW Funnel)", icon: "📷", note: "Teaser only — link in bio" },
];

const SFW_PLATFORMS = [
  { value: "youtube", label: "YouTube", icon: "▶", note: "Long-form + Shorts" },
  { value: "tiktok", label: "TikTok", icon: "🎵", note: "Short-form, algorithm-driven" },
  { value: "instagram", label: "Instagram", icon: "📷", note: "Reels, Stories, Posts" },
  { value: "twitter", label: "Twitter / X", icon: "X", note: "Threads, clips, engagement" },
  { value: "facebook", label: "Facebook", icon: "f", note: "Reels, Groups, Pages" },
];

function ScoreCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const pct = Math.min(100, value);
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-xl font-black" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ViralOptimizer() {
  const { isAdult, accentColor, niche } = useCreatorMode();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<string>(isAdult ? "onlyfans" : "youtube");
  const [result, setResult] = useState<any>(null);

  // @ts-ignore
  const optimize = trpc.viralOptimizer.analyze.useMutation();
  // @ts-ignore
  const history = trpc.viralOptimizer.getHistory.useQuery({ limit: 20 });

  const platforms = isAdult ? ADULT_PLATFORMS : SFW_PLATFORMS;

  const handleOptimize = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Enter a content title to analyze.", variant: "destructive" });
      return;
    }
    try {
      const res = await optimize.mutateAsync({
        title,
        description: `[${niche}] ${description}`,
        platform: platform as any,
      });
      setResult(res);
      history.refetch();
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const accentScores = isAdult
    ? [
        { label: "PPV Conversion", key: "viralScore", icon: DollarSign, color: "#a855f7" },
        { label: "Desire Grade", key: "hookScore", icon: Flame, color: "#ec4899" },
        { label: "Teaser Compliance", key: "qualityScore", icon: Shield, color: "#22c55e" },
        { label: "Funnel Strength", key: "audienceScore", icon: TrendingUp, color: "#f59e0b" },
      ]
    : [
        { label: "Viral Score", key: "viralScore", icon: Flame, color: "#3b82f6" },
        { label: "Hook Score", key: "hookScore", icon: Zap, color: "#8b5cf6" },
        { label: "Quality Score", key: "qualityScore", icon: CheckCircle2, color: "#22c55e" },
        { label: "Trend Score", key: "trendScore", icon: TrendingUp, color: "#f59e0b" },
      ];

  return (
    <div className="min-h-screen text-white" style={{ background: "#0a0a14" }}>
      <div className="border-b" style={{ background: isAdult ? "linear-gradient(135deg,#0d0520,#1a0a30)" : "linear-gradient(135deg,#050d20,#0a1530)", borderColor: `${accentColor}22` }}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}>
                  {isAdult ? <Flame className="w-5 h-5" style={{ color: accentColor }} /> : <TrendingUp className="w-5 h-5" style={{ color: accentColor }} />}
                </div>
                <div>
                  <h1 className="text-2xl font-black">{isAdult ? "VaultX Viral Engine" : "Viral Optimizer"}</h1>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                    {isAdult ? "PPV Conversion · Teaser Compliance · Desire-Grade Analysis" : "Algorithm Retention · CTR Optimization · Trend Scoring"}
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-sm max-w-xl">
                {isAdult
                  ? "Analyze your content for PPV conversion potential, shadowban risk, and desire-grade aesthetics. Get platform-specific hooks that drive fans from free social to your paid vault."
                  : "Analyze your content for viral potential, algorithm retention, and engagement hooks. Get platform-native copy that drives views, subscribers, and brand deals."}
              </p>
            </div>
            <CreatorModeSwitcher compact />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 border" style={{ background: "#0f0f1e", borderColor: `${accentColor}25` }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: accentColor }} />
              {isAdult ? "Content Analysis" : "Analyze Content"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                  {isAdult ? "Drop Title / Teaser Name" : "Content Title *"}
                </label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder={isAdult ? "e.g. Exclusive Drop Members Only" : "e.g. I tried every AI tool for 30 days"}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                  {isAdult ? "Content Description / Caption" : "Description / Script Hook"}
                </label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder={isAdult ? "Describe the content, the vibe, and the platform..." : "Describe your video concept, hook, or key talking points..."}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[100px] resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                  {isAdult ? "Target Platform" : "Platform *"}
                </label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.icon} {p.label} — {p.note}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isAdult && (
                <div className="rounded-xl p-3 border" style={{ background: "#a855f710", borderColor: "#a855f730" }}>
                  <p className="text-xs text-purple-300 font-semibold flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Shadowban and Compliance Check Included
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Analysis includes platform-specific compliance scoring to avoid content restrictions on SFW funnels.</p>
                </div>
              )}
              <Button onClick={handleOptimize} disabled={optimize.isPending || !title.trim()} className="w-full font-bold py-3 text-sm border-0"
                style={{ background: optimize.isPending ? "#ffffff20" : `linear-gradient(135deg,${accentColor},${isAdult ? "#ec4899" : "#6366f1"})`, color: "white" }}>
                {optimize.isPending ? (
                  <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 animate-spin" />{isAdult ? "Analyzing PPV Potential..." : "Analyzing Virality..."}</span>
                ) : (
                  <span className="flex items-center gap-2"><Flame className="w-4 h-4" />{isAdult ? "Analyze PPV and Viral Potential" : "Optimize for Virality"}</span>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl p-6 border" style={{ background: "#0f0f1e", borderColor: `${accentColor}25` }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5" style={{ color: accentColor }} />
              {isAdult ? "PPV and Viral Analysis" : "Viral Analysis"}
            </h2>
            {result ? (
              <div className="space-y-5">
                <div className="rounded-xl p-4 text-center border" style={{ background: `${accentColor}10`, borderColor: `${accentColor}30` }}>
                  <div className="text-5xl font-black mb-1" style={{ color: accentColor }}>
                    {result.viralScore}<span className="text-2xl text-gray-500">/100</span>
                  </div>
                  <p className="text-sm font-bold text-gray-300">{isAdult ? "PPV Conversion Score" : "Viral Score"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {result.viralScore >= 80 ? (isAdult ? "Elite — This content will convert" : "Viral potential is extremely high")
                      : result.viralScore >= 60 ? (isAdult ? "Strong — Solid PPV candidate" : "Good — Optimize hooks for better reach")
                      : (isAdult ? "Needs work — Refine the desire grade" : "Below average — Major improvements needed")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {accentScores.map((s) => (
                    <ScoreCard key={s.key} label={s.label} value={result[s.key] ?? 0} icon={s.icon} color={s.color} />
                  ))}
                </div>
                {result.hooks?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" style={{ color: accentColor }} />
                      {isAdult ? "Desire Hooks" : "Viral Hooks"}
                    </h3>
                    <div className="space-y-2">
                      {result.hooks.map((hook: string, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-2 bg-white/5 border border-white/10 rounded-lg p-3 group">
                          <p className="text-sm text-gray-300 flex-1">{hook}</p>
                          <button onClick={() => copyToClipboard(hook)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.optimizedTitle && (
                  <div>
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                      {isAdult ? "Optimized Drop Title" : "Optimized Title"}
                    </h3>
                    <div className="flex items-start justify-between gap-2 rounded-lg p-3 border group cursor-pointer"
                      style={{ background: `${accentColor}08`, borderColor: `${accentColor}25` }}
                      onClick={() => copyToClipboard(result.optimizedTitle)}>
                      <p className="text-sm font-semibold text-white flex-1">{result.optimizedTitle}</p>
                      <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-white shrink-0 mt-0.5" />
                    </div>
                  </div>
                )}
                {result.recommendations?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      {isAdult ? "Monetization Recommendations" : "Recommendations"}
                    </h3>
                    <div className="space-y-1.5">
                      {result.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="text-yellow-400 shrink-0 mt-0.5">-&gt;</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                  {isAdult ? <Flame className="w-8 h-8" style={{ color: accentColor }} /> : <TrendingUp className="w-8 h-8" style={{ color: accentColor }} />}
                </div>
                <p className="text-gray-400 font-semibold">{isAdult ? "Analyze your content" : "Run an analysis"}</p>
                <p className="text-gray-600 text-sm mt-1">
                  {isAdult ? "Enter a drop title and platform to get your PPV conversion score" : "Enter a title and platform to see your viral potential"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl p-6 border" style={{ background: "#0f0f1e", borderColor: "#ffffff10" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            {isAdult ? "Analysis History" : "History"}
          </h2>
          {/* @ts-ignore */}
          {history.data && history.data.length > 0 ? (
            <div className="space-y-2">
              {/* @ts-ignore */}
              {history.data.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.platform} {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-xl font-black ml-4 shrink-0" style={{ color: item.viralScore >= 80 ? "#22c55e" : item.viralScore >= 60 ? "#f59e0b" : "#ef4444" }}>
                    {item.viralScore}<span className="text-xs text-gray-500 font-normal">/100</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-600 py-8 text-sm">
              {isAdult ? "No analyses yet — run your first PPV analysis above" : "No history yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
