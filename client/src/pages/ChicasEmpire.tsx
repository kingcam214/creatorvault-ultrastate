import { trpc } from "@/lib/trpc";
import { Users, TrendingUp, DollarSign, Star, Crown, Target } from "lucide-react";

export default function ChicasEmpire() {
  const { data } = trpc.chicasEmpire.getEmpireResources.useQuery(undefined, { retry: false });

  const modules = [
    { title: "Chica Cockpit", href: "/chica-cockpit", icon: "🎯", desc: "Individual chica performance dashboard" },
    { title: "Chica Loyalty", href: "/chica-loyalty", icon: "💎", desc: "Loyalty rewards & retention system" },
    { title: "Chica Funnel", href: "/chica-funnel", icon: "🔄", desc: "Recruitment & conversion pipeline" },
    { title: "Empire Agents", href: "/king/empire", icon: "🤖", desc: "49 AI agents managing the empire" },
    { title: "Telegram Hub", href: "/king/telegram-hub", icon: "📱", desc: "Broadcast to all chicas" },
    { title: "Challenge Story", href: "/king/challenge-story", icon: "💰", desc: "$5k Empire Challenge tracker" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Chicas Empire</h1>
            <p className="text-gray-400">Your creator network command center</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Chicas", value: data?.resources?.length ?? "—", icon: Users, color: "text-pink-400" },
            { label: "Active Today", value: data?.resources?.filter((r: any) => r.type === "active")?.length ?? "—", icon: TrendingUp, color: "text-green-400" },
            { label: "Empire Revenue", value: "—", icon: DollarSign, color: "text-yellow-400" },
            { label: "Top Performers", value: data?.resources?.slice(0, 3)?.length ?? 0, icon: Star, color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Empire Strategy */}
        {data?.resources && (
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-5 mb-8">
            <h3 className="font-bold text-pink-400 mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Empire Strategy</h3>
            <p className="text-gray-300 text-sm">{data?.resources?.map((r: any) => r.title).join(", ") ?? "No strategy data"}</p>
          </div>
        )}

        {/* Module Grid */}
        <h2 className="text-lg font-semibold text-gray-300 mb-4">Empire Modules</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(m => (
            <a key={m.href} href={m.href} className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 rounded-xl p-4 transition-all group cursor-pointer block">
              <div className="text-2xl mb-2">{m.icon}</div>
              <p className="font-semibold group-hover:text-pink-400 transition-colors">{m.title}</p>
              <p className="text-gray-500 text-sm mt-1">{m.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
