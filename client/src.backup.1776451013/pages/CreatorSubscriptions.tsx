import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function CreatorSubscriptions() {
  const { user } = useAuth();
  const [tierName, setTierName] = useState("");
  const [tierPrice, setTierPrice] = useState("");
  const [tierDescription, setTierDescription] = useState("");

  const { data: tiers, refetch: refetchTiers } = trpc.subscriptions.getCreatorTiers.useQuery(
    { creatorId: user?.id || 0 },
    { enabled: !!user }
  );

  const { data: balance } = trpc.subscriptions.getBalance.useQuery(
    { creatorId: user?.id || 0 },
    { enabled: !!user }
  );

  const createTier = trpc.subscriptions.createTier.useMutation({
    onSuccess: () => {
      refetchTiers();
      setTierName("");
      setTierPrice("");
      setTierDescription("");
    },
  });

  const handleCreateTier = () => {
    if (!user || !tierName || !tierPrice) return;

    createTier.mutate({
      creatorId: user.id,
      name: tierName,
      priceInCents: Math.floor(parseFloat(tierPrice) * 100),
      description: tierDescription,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Please log in to manage subscriptions</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-cyan-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">💰 Subscription Management</h1>

        {/* Balance Display */}
        <Card className="bg-gradient-to-r from-green-900 to-emerald-900 p-6 mb-8 border-2 border-green-500">
          <h2 className="text-2xl font-bold mb-4">Your Balance</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-300">Available</p>
              <p className="text-3xl font-bold text-green-400">
                ${((balance?.availableBalanceInCents || 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-300">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">
                ${((balance?.pendingBalanceInCents || 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-300">Lifetime Earnings</p>
              <p className="text-3xl font-bold text-cyan-400">
                ${((balance?.lifetimeEarningsInCents || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Create Tier Form */}
        <Card className="bg-gray-900 p-6 mb-8 border-2 border-cyan-600">
          <h2 className="text-2xl font-bold mb-4">Create Subscription Tier</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Tier Name</label>
              <Input
                value={tierName}
                onChange={(e) => setTierName(e.target.value)}
                placeholder="e.g., Basic, VIP, Premium"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Monthly Price (USD)</label>
              <Input
                type="number"
                step="0.01"
                value={tierPrice}
                onChange={(e) => setTierPrice(e.target.value)}
                placeholder="9.99"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Description (optional)</label>
              <Input
                value={tierDescription}
                onChange={(e) => setTierDescription(e.target.value)}
                placeholder="What fans get with this tier"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <Button
              onClick={handleCreateTier}
              disabled={!tierName || !tierPrice || createTier.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 w-full"
            >
              {createTier.isPending ? "Creating..." : "Create Tier"}
            </Button>
          </div>
        </Card>

        {/* Existing Tiers */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Subscription Tiers</h2>
          {!tiers || tiers.length === 0 ? (
            <Card className="bg-gray-900 p-6 border-gray-700">
              <p className="text-gray-400">No tiers created yet. Create your first tier above!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tiers.map((tier) => (
                <Card key={tier.id} className="bg-gray-900 p-6 border-2 border-cyan-600">
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-3xl font-bold text-cyan-400 mb-2">
                    ${(tier.priceInCents / 100).toFixed(2)}/month
                  </p>
                  {tier.description && (
                    <p className="text-sm text-gray-400 mb-4">{tier.description}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    <p>You earn: ${((tier.priceInCents * 0.7) / 100).toFixed(2)} (70%)</p>
                    <p>Platform: ${((tier.priceInCents * 0.3) / 100).toFixed(2)} (30%)</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">Share link:</p>
                    <code className="text-xs bg-gray-800 p-2 rounded block mt-1 break-all">
                      {window.location.origin}/subscribe/{tier.id}
                    </code>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
