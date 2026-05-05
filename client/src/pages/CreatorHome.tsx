import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Play, TrendingUp, DollarSign, Users, Video, Star, ArrowRight, Zap } from "lucide-react";

export default function CreatorHome() {
  const { user } = useAuth();
  const { data: stats } = (trpc.vaultAnalytics as any).getOverview?.useQuery(undefined, { retry: false });

  const tools = [
    { label: "VaultX Studio", href: "/creator/video-studio", icon: "🎬", desc: "Edit & monetize videos" },
    { label: "Script Writer", href: "/king/script-writer", icon: "✍️", desc: "AI-powered scripts" },
    { label: "Telegram Hub", href: "/king/telegram-hub", icon: "📱", desc: "Broadcast to fans" },
    { label: "Empire Agents", href: "/king/empire", icon: "🤖", desc: "49 AI agents working" },
    { label: "Challenge", href: "/king/challenge-story", icon: "💰", desc: "$5k Empire Challenge" },
    { label: "Analytics", href: "/creator/analytics", icon: "📊", desc: "Track performance" },
    { label: "Marketplace", href: "/marketplace", icon: "🛒", desc: "Sell your products" },
    { label: "Brand Deals", href: "/brand-deals", icon: "🤝", desc: "Land sponsorships" },
    { label: "KingCam Engine", href: "/king/engine", icon: "🎥", desc: "Clone video studio" },
    { label: "Viral Optimizer", href: "/tools/viral-optimizer", icon: "🔥", desc: "Maximize reach" },
    { label: "Podcast Studio", href: "/podcast-studio", icon: "🎙️", desc: "Record & distribute" },
    { label: "Social Autoposter", href: "/social-autoposter", icon: "📲", desc: "Auto-post everywhere" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-black via-yellow-950/20 to-black border-b border-yellow-500/20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-lg">
              {user?.name?.[0] || "C"}
            </div>
            <div>
              <p className="text-yellow-400 text-sm font-medium">CREATOR DASHBOARD</p>
              <h1 className="text-2xl font-bold">Welcome back, {user?.name || "Creator"}</h1>
            </div>
          </div>
          <p className="text-gray-400 max-w-xl">Your empire command center. Every tool you need to create, monetize, and grow — all in one place.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Revenue", value: stats?.totalRevenue ? `$${stats.totalRevenue.toFixed(2)}` : "$0.00", icon: DollarSign, color: "text-green-400" },
            { label: "Subscribers", value: stats?.totalSubscribers ?? 0, icon: Users, color: "text-blue-400" },
            { label: "Content Items", value: stats?.totalContent ?? 0, icon: Video, color: "text-purple-400" },
            { label: "Empire Score", value: stats?.empireScore ?? "—", icon: Star, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tools Grid */}
        <h2 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" /> Empire Tools
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/40 rounded-xl p-4 cursor-pointer transition-all group">
                <div className="text-2xl mb-2">{tool.icon}</div>
                <p className="font-semibold text-sm group-hover:text-yellow-400 transition-colors">{tool.label}</p>
                <p className="text-gray-500 text-xs mt-1">{tool.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <Link href="/creator/video-studio">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-5 cursor-pointer hover:border-yellow-500/60 transition-all flex items-center justify-between">
              <div>
                <p className="font-bold text-yellow-400">🎬 Start Creating</p>
                <p className="text-gray-400 text-sm mt-1">Open VaultX Video Studio</p>
              </div>
              <ArrowRight className="w-5 h-5 text-yellow-400" />
            </div>
          </Link>
          <Link href="/king/challenge-story">
            <div className="bg-gradient-to-r from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-5 cursor-pointer hover:border-green-500/60 transition-all flex items-center justify-between">
              <div>
                <p className="font-bold text-green-400">💰 Empire Challenge</p>
                <p className="text-gray-400 text-sm mt-1">Track your $5k goal</p>
              </div>
              <ArrowRight className="w-5 h-5 text-green-400" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
