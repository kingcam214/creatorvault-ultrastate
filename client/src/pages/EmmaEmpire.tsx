import { trpc } from "@/lib/trpc";
import { Globe, Users, TrendingUp, DollarSign, Zap, Target } from "lucide-react";

export default function EmmaEmpire() {
  const { data } = (trpc as any).emmaNetwork?.getEmpireOverview?.useQuery?.(undefined, { retry: false }) || { data: null };

  const regions = [
    { name: "Dominican Republic", flag: "🇩🇴", creators: data?.dr ?? "—", revenue: data?.drRevenue ?? "—" },
    { name: "Haiti", flag: "🇭🇹", creators: data?.haiti ?? "—", revenue: data?.haitiRevenue ?? "—" },
    { name: "United States", flag: "🇺🇸", creators: data?.us ?? "—", revenue: data?.usRevenue ?? "—" },
    { name: "Global", flag: "🌍", creators: data?.global ?? "—", revenue: data?.globalRevenue ?? "—" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Emma Empire</h1>
            <p className="text-gray-400">Global creator network expansion overview</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Creators", value: data?.totalCreators ?? "—", icon: Users, color: "text-blue-400" },
            { label: "Empire Revenue", value: data?.totalRevenue ? `$${data.totalRevenue}` : "—", icon: DollarSign, color: "text-green-400" },
            { label: "Active Regions", value: "4", icon: Globe, color: "text-emerald-400" },
            { label: "Growth Rate", value: data?.growthRate ? `${data.growthRate}%` : "—", icon: TrendingUp, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-4">Regional Breakdown</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {regions.map(r => (
            <div key={r.name} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{r.flag}</span>
                <p className="font-bold">{r.name}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Creators: <span className="text-white font-medium">{r.creators}</span></span>
                <span className="text-gray-400">Revenue: <span className="text-green-400 font-medium">{r.revenue}</span></span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-5">
          <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> Empire Mission</h3>
          <p className="text-gray-300 text-sm">Build a global network of 10,000+ creators across the Caribbean and beyond, generating $1M+ in monthly revenue through VaultX, subscriptions, and brand partnerships.</p>
        </div>
      </div>
    </div>
  );
}
