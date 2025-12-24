import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";


export default function FanSubscribe() {
  const [, params] = useRoute("/subscribe/:tierId");
  const { user } = useAuth();
  const tierId = params?.tierId ? parseInt(params.tierId) : 0;

  const [isProcessing, setIsProcessing] = useState(false);

  const { data: tiers } = trpc.subscriptions.getCreatorTiers.useQuery(
    { creatorId: 0 }, // Will need to get creator ID from tier
    { enabled: false } // Disabled for now
  );

  const createCheckout = trpc.stripeCheckout.createCheckoutSession.useMutation();

  // Mock tier data for now
  const mockTier = {
    id: tierId,
    name: "VIP Tier",
    priceInCents: 2999, // $29.99
    description: "Access to exclusive content",
    creatorName: "Creator Name",
  };

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setIsProcessing(true);

    try {
      // Create Stripe Checkout Session
      const result = await createCheckout.mutateAsync({ tierId });
      
      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Subscribe to {mockTier.creatorName}</h1>

        <Card className="bg-gray-900 p-8 border-2 border-purple-600">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">{mockTier.name}</h2>
            <p className="text-5xl font-bold text-purple-400 mb-4">
              ${(mockTier.priceInCents / 100).toFixed(2)}<span className="text-xl">/month</span>
            </p>
            {mockTier.description && (
              <p className="text-gray-300 mb-6">{mockTier.description}</p>
            )}
          </div>

          <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <h3 className="font-bold mb-2">What you get:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>✓ Exclusive content access</li>
              <li>✓ Direct messaging with creator</li>
              <li>✓ Behind-the-scenes content</li>
              <li>✓ Priority support</li>
            </ul>
          </div>

          <div className="bg-blue-900/30 p-4 rounded-lg mb-6">
            <h3 className="font-bold mb-2">Payment Breakdown:</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Subscription:</span>
                <span>${(mockTier.priceInCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Creator receives (70%):</span>
                <span>${((mockTier.priceInCents * 0.7) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Platform fee (30%):</span>
                <span>${((mockTier.priceInCents * 0.3) / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {!user ? (
            <Button
              onClick={() => (window.location.href = "/login")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-xl py-6"
            >
              Log In to Subscribe
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-xl py-6"
            >
              {isProcessing ? "Processing..." : "Subscribe Now"}
            </Button>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            By subscribing, you agree to automatic monthly billing. Cancel anytime.
          </p>
        </Card>
      </div>
    </div>
  );
}
