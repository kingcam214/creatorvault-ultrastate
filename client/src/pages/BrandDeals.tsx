import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DollarSign, Plus, Mail, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";

export default function BrandDeals() {
  const [showCreate, setShowCreate] = useState(false);
  const [brand, setBrand] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("sponsorship");
  const { data: deals, refetch } = trpc.brandDeals.getDeals.useQuery(undefined, { retry: false });
  const createDeal = trpc.brandDeals.createDeal.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); setBrand(""); setValue(""); } });
  const genPitch = trpc.brandDeals.generatePitchEmail.useMutation();

  const statusIcon = (s: string) => s === "active" ? <CheckCircle className="w-4 h-4 text-green-400" /> : s === "pending" ? <Clock className="w-4 h-4 text-yellow-400" /> : <XCircle className="w-4 h-4 text-red-400" />;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Brand Deals</h1>
            <p className="text-gray-400 mt-1">Manage sponsorships, partnerships & brand collaborations</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Deal
          </button>
        </div>

        {showCreate && (
          <div className="bg-white/5 border border-yellow-500/30 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Create New Deal</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Brand name" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
              <input value={value} onChange={e => setValue(e.target.value)} placeholder="Deal value ($)" type="number" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
              <select value={type} onChange={e => setType(e.target.value)} className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500">
                <option value="sponsorship">Sponsorship</option>
                <option value="affiliate">Affiliate</option>
                <option value="ambassador">Brand Ambassador</option>
                <option value="collab">Collaboration</option>
              </select>
              <button onClick={() => createDeal.mutate({ brand, value: parseFloat(value) || 0, type, deliverables: ["1 post", "story mention"] })} disabled={!brand || !value} className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-4 py-2 rounded-lg transition-colors">
                {createDeal.isPending ? "Creating..." : "Create Deal"}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{deals?.filter((d: any) => d.status === "active").length || 0}</p>
            <p className="text-gray-400 text-sm">Active Deals</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">${deals?.reduce((s: number, d: any) => s + (d.value || 0), 0).toFixed(0) || 0}</p>
            <p className="text-gray-400 text-sm">Total Value</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{deals?.length || 0}</p>
            <p className="text-gray-400 text-sm">Total Deals</p>
          </div>
        </div>

        {/* Deals List */}
        <div className="space-y-3">
          {deals?.length === 0 && <div className="text-center py-12 text-gray-500">No deals yet. Create your first brand deal above.</div>}
          {deals?.map((deal: any) => (
            <div key={deal.id} className="bg-white/5 border border-white/10 hover:border-yellow-500/30 rounded-xl p-4 flex items-center justify-between transition-all">
              <div className="flex items-center gap-3">
                {statusIcon(deal.status)}
                <div>
                  <p className="font-semibold">{deal.brand}</p>
                  <p className="text-gray-400 text-sm capitalize">{deal.type} • {new Date(deal.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-green-400 font-bold">${deal.value?.toFixed(2)}</p>
                <button onClick={() => genPitch.mutate({ brand: deal.brand, myStats: "50K followers, 8% engagement", proposedDeal: `$${deal.value} ${deal.type}` })} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Pitch Email
                </button>
              </div>
            </div>
          ))}
        </div>

        {genPitch.data && (
          <div className="mt-6 bg-white/5 border border-blue-500/30 rounded-xl p-4">
            <h3 className="font-bold text-blue-400 mb-2">Generated Pitch Email</h3>
            <pre className="text-gray-300 text-sm whitespace-pre-wrap">{genPitch.data.email}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
