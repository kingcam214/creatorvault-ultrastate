import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Video, Lock, Unlock, Eye, DollarSign, Plus, Filter } from "lucide-react";
import { Link } from "wouter";

export default function ContentDashboard() {
  const [filter, setFilter] = useState<"all" | "ppv" | "free" | "subscription">("all");
  const { data: contentData } = trpc.vaultx.getCreatorContent.useQuery({ creatorId: 6, limit: 50 }, { retry: false });
  const items = contentData?.items || [];
  const filtered = filter === "all" ? items : items.filter((i: any) => i.unlock_type === filter);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Content Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage all your published content</p>
          </div>
          <Link href="/vault-x/editor">
            <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Upload Content
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: items.length, icon: Video, color: "text-blue-400" },
            { label: "PPV", value: items.filter((i: any) => i.unlock_type === "ppv").length, icon: Lock, color: "text-red-400" },
            { label: "Free", value: items.filter((i: any) => i.unlock_type === "free").length, icon: Unlock, color: "text-green-400" },
            { label: "Revenue", value: `$${items.reduce((s: number, i: any) => s + (i.price_cents || 0) / 100, 0).toFixed(2)}`, icon: DollarSign, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "ppv", "free", "subscription"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${filter === f ? "bg-yellow-500 text-black" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No content yet. Upload your first video to get started.</p>
            <Link href="/vault-x/editor"><button className="mt-4 bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg">Open VaultX Editor</button></Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item: any) => (
              <div key={item.id} className="bg-white/5 border border-white/10 hover:border-yellow-500/30 rounded-xl overflow-hidden transition-all group">
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                  {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" /> : <Video className="w-8 h-8 text-gray-600" />}
                  <div className="absolute top-2 right-2">
                    {item.unlock_type === "ppv" ? <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">PPV</span> : item.unlock_type === "free" ? <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">FREE</span> : <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">SUB</span>}
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{item.title}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views || 0} views</span>
                    {item.price_cents > 0 && <span className="text-green-400 font-medium">${(item.price_cents / 100).toFixed(2)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
