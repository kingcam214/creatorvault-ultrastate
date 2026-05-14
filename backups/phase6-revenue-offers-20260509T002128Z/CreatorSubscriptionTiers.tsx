import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Crown, Star, Zap, DollarSign, Users, Check, Plus, Edit } from "lucide-react";

export default function CreatorSubscriptionTiers() {
  const [showCreate, setShowCreate] = useState(false);
  const [tierName, setTierName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const { data: tiers, refetch } = (trpc as any).subscriptionTiers?.getMyTiers?.useQuery?.(undefined, { retry: false }) || { data: [], refetch: () => {} };
  const createTier = (trpc as any).subscriptionTiers?.createTier?.useMutation?.({ onSuccess: () => { refetch(); setShowCreate(false); } }) || { mutate: () => {}, isPending: false };

  const defaultTiers = [
    { name: "Fan", price: 4.99, icon: Star, color: "from-blue-500 to-blue-600", features: ["Exclusive posts", "Early access", "Fan badge"] },
    { name: "Supporter", price: 9.99, icon: Crown, color: "from-purple-500 to-purple-600", features: ["All Fan perks", "DM access", "Monthly shoutout", "Behind-the-scenes"] },
    { name: "VIP", price: 24.99, icon: Zap, color: "from-yellow-500 to-yellow-600", features: ["All Supporter perks", "1-on-1 calls", "Custom content", "Priority support", "VIP badge"] },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Subscription Tiers</h1>
            <p className="text-gray-400 mt-1">Set up your creator subscription plans</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create Tier
          </button>
        </div>

        {showCreate && (
          <div className="bg-white/5 border border-yellow-500/30 rounded-xl p-6 mb-8">
            <h2 className="font-bold text-lg mb-4">Create New Tier</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <input value={tierName} onChange={e => setTierName(e.target.value)} placeholder="Tier name (e.g., VIP)" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price per month ($)" type="number" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
            </div>
            <button onClick={() => createTier.mutate?.({ name: tierName, price: parseFloat(price) || 0, description })} disabled={!tierName || !price} className="mt-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-6 py-2.5 rounded-lg transition-colors">
              {createTier.isPending ? "Creating..." : "Create Tier"}
            </button>
          </div>
        )}

        {/* Default Tier Templates */}
        <h2 className="text-lg font-semibold text-gray-300 mb-4">Recommended Tier Structure</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {defaultTiers.map(tier => (
            <div key={tier.name} className={`bg-gradient-to-b ${tier.color} p-0.5 rounded-2xl`}>
              <div className="bg-gray-900 rounded-2xl p-6 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <tier.icon className="w-5 h-5 text-yellow-400" />
                  <span className="font-bold text-lg">{tier.name}</span>
                </div>
                <p className="text-3xl font-bold mb-1">${tier.price}<span className="text-gray-400 text-base font-normal">/mo</span></p>
                <div className="mt-4 space-y-2">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button className="mt-5 w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Use This Template
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Existing Tiers */}
        {tiers && tiers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Your Active Tiers</h2>
            <div className="space-y-3">
              {tiers.map((tier: any) => (
                <div key={tier.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{tier.name}</p>
                    <p className="text-gray-400 text-sm">{tier.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-green-400 font-bold">${tier.price}/mo</p>
                    <button className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors">
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
