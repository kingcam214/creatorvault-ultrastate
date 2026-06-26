import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { DollarSign, Users, Video, Star, ArrowRight, Zap, Smartphone } from "lucide-react";

export default function CreatorHome() {
  const { user } = useAuth();
  const { data: stats } = (trpc.vaultAnalytics as any).getOverview?.useQuery(undefined, { retry: false });

  const tools = [
    { label: "Edit a drop", href: "/vault-x/editor", icon: "🎬", desc: "Cut clips, package teasers, and prep paid content from your phone." },
    { label: "Make motion", href: "/vault-x/studio?mode=ai-video-generator#pollo", icon: "⚡", desc: "Turn a strong image into a scroll-stopping video." },
    { label: "Write the script", href: "/king/script-writer", icon: "✍️", desc: "Create captions, scene ideas, and sales messages fast." },
    { label: "Broadcast to fans", href: "/king/telegram-hub", icon: "📱", desc: "Send updates and offers without hunting through menus." },
    { label: "Clone studio", href: "/king/clone-command", icon: "👑", desc: "Create clone images, then turn the best shot into motion." },
    { label: "Challenge tracker", href: "/king/challenge-story", icon: "💰", desc: "See the next money move and what still needs attention." },
    { label: "Performance", href: "/creator/analytics", icon: "📊", desc: "Track what is getting views, fans, and revenue." },
    { label: "Sell products", href: "/marketplace", icon: "🛒", desc: "Package offers and make them easier to buy." },
    { label: "Brand deals", href: "/brand-deals", icon: "🤝", desc: "Organize sponsorship opportunities and creator offers." },
    { label: "Viral boost", href: "/tools/viral-optimizer", icon: "🔥", desc: "Tighten hooks, captions, and reach before posting." },
    { label: "Podcast studio", href: "/podcast-studio", icon: "🎙️", desc: "Record, package, and distribute longer-form content." },
    { label: "Auto-post", href: "/social-autoposter", icon: "📲", desc: "Queue finished content across your channels." },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <video src="/videos/platform/dashboard-hero.mp4" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[.3] pointer-events-none" muted autoPlay loop playsInline preload="metadata" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-black/78 to-black" />
      <div className="relative z-10 overflow-hidden bg-gradient-to-br from-black/65 via-yellow-950/25 to-black/75 border-b border-yellow-500/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-lg shrink-0">
              {user?.name?.[0] || "C"}
            </div>
            <div>
              <p className="text-yellow-400 text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase">Creator launchpad</p>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.name || "Creator"}</h1>
            </div>
          </div>
          <p className="text-gray-300 max-w-2xl leading-relaxed">Everything here is built for a phone-first creator: make the asset, polish the drop, send it to fans, and track what earns.</p>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 via-white/5 to-purple-500/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-yellow-400 text-black flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-yellow-300 font-bold text-lg">Start on your phone</p>
              <p className="text-gray-300 text-sm leading-relaxed mt-1">Use this as a simple daily flow: create the visual, edit the drop, then broadcast or sell it. No laptop should be required for the core moves.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-sm">
                {["1. Create a shot", "2. Package the drop", "3. Send or sell"].map((step) => (
                  <div key={step} className="rounded-xl bg-black/30 border border-white/10 px-3 py-3 text-gray-200 font-semibold">{step}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {[
            { label: "Revenue", value: stats?.totalRevenue ? `$${stats.totalRevenue.toFixed(2)}` : "$0.00", icon: DollarSign, color: "text-green-400" },
            { label: "Subscribers", value: stats?.totalSubscribers ?? 0, icon: Users, color: "text-blue-400" },
            { label: "Content", value: stats?.totalContent ?? 0, icon: Video, color: "text-purple-400" },
            { label: "Empire Score", value: stats?.empireScore ?? "—", icon: Star, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[112px]">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl sm:text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" /> Creator tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/40 rounded-xl p-4 min-h-[116px] cursor-pointer transition-all group">
                <div className="text-2xl mb-2">{tool.icon}</div>
                <p className="font-semibold text-sm group-hover:text-yellow-400 transition-colors">{tool.label}</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">{tool.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/king/clone-command">
            <div className="bg-gradient-to-r from-cyan-500/20 to-yellow-500/10 border border-cyan-500/40 rounded-xl p-5 min-h-[92px] cursor-pointer hover:border-cyan-400/70 transition-all flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-cyan-300">Open Clone Command Studio</p>
                <p className="text-gray-300 text-sm mt-1">Create the shot, then make it move.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-cyan-300 shrink-0" />
            </div>
          </Link>
          <Link href="/vault-x/editor">
            <div className="bg-gradient-to-r from-purple-500/25 via-pink-500/15 to-yellow-500/10 border border-purple-500/40 rounded-xl p-5 min-h-[92px] cursor-pointer hover:border-pink-500/70 transition-all flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-purple-300">Package a finished drop</p>
                <p className="text-gray-300 text-sm mt-1">Cut, polish, export, and prep content for sales.</p>
              </div>
              <ArrowRight className="w-5 h-5 text-purple-300 shrink-0" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
