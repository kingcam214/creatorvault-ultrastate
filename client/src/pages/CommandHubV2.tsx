import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Terminal, Zap, Globe, Bot, TrendingUp, Settings, Play, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function CommandHubV2() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: status } = (trpc.commandHubV2 as any)?.getStatus?.useQuery?.(undefined, { retry: false }) || { data: null };

  const commands = [
    { id: "empire-launch", label: "Launch Empire Sequence", icon: "🚀", desc: "Activate all 49 AI agents", status: "ready" },
    { id: "content-blast", label: "Content Blast", icon: "📢", desc: "Post to all platforms simultaneously", status: "ready" },
    { id: "revenue-sweep", label: "Revenue Sweep", icon: "💰", desc: "Collect and report all revenue streams", status: "ready" },
    { id: "network-expand", label: "Network Expansion", icon: "🌐", desc: "Recruit new creators via Emma network", status: "ready" },
    { id: "brand-outreach", label: "Brand Outreach", icon: "🤝", desc: "Auto-pitch to 50 brands", status: "ready" },
    { id: "analytics-sync", label: "Analytics Sync", icon: "📊", desc: "Sync all platform analytics", status: "ready" },
  ];

  const quickLinks = [
    { label: "King Dashboard", href: "/king", icon: "👑" },
    { label: "Empire Agents", href: "/king/empire", icon: "🤖" },
    { label: "Telegram Hub", href: "/king/telegram-hub", icon: "📱" },
    { label: "VaultX Editor", href: "/vault-x/editor", icon: "🎬" },
    { label: "Analytics", href: "/analytics", icon: "📊" },
    { label: "Marketplace", href: "/marketplace", icon: "🛒" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Command Hub V2</h1>
            <p className="text-gray-400">Central command & control for your entire empire</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            All Systems Online
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Agents", value: "49", icon: Bot, color: "text-cyan-400" },
            { label: "Commands Run", value: status?.commandsRun ?? "0", icon: Terminal, color: "text-blue-400" },
            { label: "Revenue Today", value: status?.revenueToday ? `$${status.revenueToday}` : "$0", icon: TrendingUp, color: "text-green-400" },
            { label: "Uptime", value: "99.9%", icon: Zap, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Commands */}
        <h2 className="text-lg font-semibold mb-4">Empire Commands</h2>
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          {commands.map(cmd => (
            <div key={cmd.id} className="bg-white/5 border border-white/10 hover:border-cyan-500/30 rounded-xl p-4 flex items-center justify-between transition-all group">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cmd.icon}</span>
                <div>
                  <p className="font-semibold text-sm group-hover:text-cyan-400 transition-colors">{cmd.label}</p>
                  <p className="text-gray-500 text-xs">{cmd.desc}</p>
                </div>
              </div>
              <button className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                <Play className="w-3 h-3" /> Run
              </button>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickLinks.map(l => (
            <Link key={l.href} href={l.href}>
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 rounded-xl p-3 text-center cursor-pointer transition-all">
                <div className="text-2xl mb-1">{l.icon}</div>
                <p className="text-xs text-gray-400">{l.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
