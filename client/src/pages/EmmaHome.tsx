import { trpc } from "@/lib/trpc";
import { Users, TrendingUp, DollarSign, Star, ArrowRight, Zap } from "lucide-react";
import { Link } from "wouter";

export default function EmmaHome() {
  const { data: stats } = trpc.emmaNetwork?.getStats?.useQuery?.(undefined, { retry: false }) || { data: null };

  const modules = [
    { label: "Emma Empire", href: "/emma-empire", icon: "👑", desc: "Full empire overview" },
    { label: "Emma Oversight", href: "/king/emma", icon: "🔍", desc: "Network monitoring" },
    { label: "Emma University", href: "/emma-university", icon: "🎓", desc: "Training & education" },
    { label: "Transparency Log", href: "/emma-transparency-log", icon: "📋", desc: "Activity audit trail" },
    { label: "Chicas Empire", href: "/chicas-empire", icon: "💎", desc: "Creator network" },
    { label: "Agent Tracker", href: "/agent-tracker", icon: "🤖", desc: "AI agent performance" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-2xl">👑</div>
          <div>
            <h1 className="text-3xl font-bold">Emma Network</h1>
            <p className="text-gray-400">Your AI-powered creator recruitment & management network</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Network Size", value: stats?.networkSize ?? "—", icon: Users, color: "text-emerald-400" },
            { label: "Active Agents", value: stats?.activeAgents ?? "49", icon: Zap, color: "text-yellow-400" },
            { label: "Monthly Revenue", value: stats?.monthlyRevenue ? `$${stats.monthlyRevenue}` : "—", icon: DollarSign, color: "text-green-400" },
            { label: "Success Rate", value: stats?.successRate ? `${stats.successRate}%` : "—", icon: Star, color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(m => (
            <Link key={m.href} href={m.href}>
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl p-5 cursor-pointer transition-all group flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{m.icon}</div>
                  <div>
                    <p className="font-semibold group-hover:text-emerald-400 transition-colors">{m.label}</p>
                    <p className="text-gray-500 text-xs">{m.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
