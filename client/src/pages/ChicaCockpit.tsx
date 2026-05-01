import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Target, TrendingUp, MessageSquare, DollarSign, Users, Zap } from "lucide-react";

export default function ChicaCockpit() {
  const { user } = useAuth();

  const metrics = [
    { label: "Fans Reached", value: "—", icon: Users, color: "text-blue-400", trend: "+0%" },
    { label: "Messages Sent", value: "—", icon: MessageSquare, color: "text-green-400", trend: "+0%" },
    { label: "Revenue", value: "$0.00", icon: DollarSign, color: "text-yellow-400", trend: "+0%" },
    { label: "Conversions", value: "—", icon: Target, color: "text-pink-400", trend: "+0%" },
  ];

  const tasks = [
    { task: "Send morning broadcast to Telegram", status: "pending", priority: "high" },
    { task: "Post 3 content pieces today", status: "pending", priority: "high" },
    { task: "Reply to DMs within 2 hours", status: "pending", priority: "medium" },
    { task: "Update subscription price", status: "pending", priority: "low" },
    { task: "Generate weekly performance report", status: "pending", priority: "medium" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Chica Cockpit</h1>
            <p className="text-gray-400 text-sm">Welcome back, {user?.name || "Chica"}</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {metrics.map(m => (
            <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <m.icon className={`w-5 h-5 ${m.color} mb-2`} />
              <p className="text-xl font-bold">{m.value}</p>
              <p className="text-gray-400 text-sm">{m.label}</p>
              <p className="text-green-400 text-xs mt-1">{m.trend}</p>
            </div>
          ))}
        </div>

        {/* Today's Tasks */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> Today's Mission</h2>
          <div className="space-y-3">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${t.priority === "high" ? "bg-red-400" : t.priority === "medium" ? "bg-yellow-400" : "bg-gray-400"}`} />
                <p className="text-sm flex-1">{t.task}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.priority === "high" ? "bg-red-500/20 text-red-400" : t.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Telegram Hub", href: "/king/telegram-hub", icon: "📱" },
            { label: "VaultX Studio", href: "/creator/video-studio", icon: "🎬" },
            { label: "Script Writer", href: "/king/script-writer", icon: "✍️" },
            { label: "Analytics", href: "/creator/analytics", icon: "📊" },
            { label: "Empire Challenge", href: "/king/challenge-story", icon: "💰" },
            { label: "Marketplace", href: "/marketplace", icon: "🛒" },
          ].map(l => (
            <a key={l.href} href={l.href} className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 rounded-xl p-4 transition-all text-center block">
              <div className="text-2xl mb-1">{l.icon}</div>
              <p className="text-sm font-medium">{l.label}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
