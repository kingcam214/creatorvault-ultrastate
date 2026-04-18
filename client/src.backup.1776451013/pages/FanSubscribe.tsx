import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function FanSubscribe() {
  const [, params] = useRoute("/subscribe/:tierId");
  const { user } = useAuth();
  const { toast } = useToast();
  const tierId = params?.tierId ? parseInt(params.tierId) : 0;

  const [step, setStep] = useState<"select" | "instructions" | "confirm">("select");
  const [paymentMethod, setPaymentMethod] = useState<"cashapp" | "zelle" | "applepay" | "venmo" | "paypal" | "">("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [notes, setNotes] = useState("");

  // Get tier details
  const { data: tier, isLoading } = trpc.subscriptions.getTier.useQuery(
    { tierId },
    { enabled: tierId > 0 }
  );

  const createSubscription = trpc.subscriptions.createSubscription.useMutation({
    onSuccess: () => {
      toast({
        title: "Subscription Pending",
        description: "Your subscription will be activated once payment is confirmed.",
      });
      setStep("confirm");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePaymentMethodSelect = (method: typeof paymentMethod) => {
    setPaymentMethod(method);
    setStep("instructions");
  };

  const handleConfirmPayment = async () => {
    if (!user || !tier) return;

    await createSubscription.mutateAsync({
      tierId: tier.id,
      fanId: user.id,
      paymentMethod: paymentMethod as string,
      confirmationCode,
      notes,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!tier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white flex items-center justify-center">
        <Card className="bg-gray-900 p-8 border-2 border-red-600">
          <h2 className="text-2xl font-bold text-red-400">Tier Not Found</h2>
          <p className="text-gray-300 mt-2">This subscription tier does not exist.</p>
        </Card>
      </div>
    );
  }

  const priceInDollars = tier.priceInCents / 100;
  const creatorReceives = (tier.priceInCents * 0.7) / 100;
  const platformFee = (tier.priceInCents * 0.3) / 100;

  // Get creator payment handles (mock for now - should come from tier.creator)
  const paymentHandles = {
    cashapp: "$KingCam",
    zelle: "kingcam@creatorvault.com",
    applepay: "kingcam@creatorvault.com",
    venmo: "@KingCam",
    paypal: "kingcam@creatorvault.com",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Subscribe to {tier.creatorName || "Creator"}</h1>

        {step === "select" && (
          <Card className="bg-gray-900 p-8 border-2 border-purple-600">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">{tier.name}</h2>
              <p className="text-5xl font-bold text-purple-400 mb-4">
                ${priceInDollars.toFixed(2)}<span className="text-xl">/month</span>
              </p>
              {tier.description && (
                <p className="text-gray-300 mb-6">{tier.description}</p>
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
                  <span>${priceInDollars.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Creator receives (70%):</span>
                  <span>${creatorReceives.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Platform fee (30%):</span>
                  <span>${platformFee.toFixed(2)}</span>
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
              <div className="space-y-3">
                <h3 className="font-bold text-center mb-4">Choose Payment Method:</h3>
                <Button
                  onClick={() => handlePaymentMethodSelect("cashapp")}
                  className="w-full bg-green-600 hover:bg-green-700 py-4"
                >
                  💵 CashApp
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("zelle")}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-4"
                >
                  💳 Zelle
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("applepay")}
                  className="w-full bg-gray-700 hover:bg-gray-800 py-4"
                >
                  🍎 Apple Pay
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("venmo")}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4"
                >
                  💙 Venmo
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("paypal")}
                  className="w-full bg-blue-500 hover:bg-blue-600 py-4"
                >
                  🌐 PayPal
                </Button>
              </div>
            )}
          </Card>
        )}

        {step === "instructions" && paymentMethod && (
          <Card className="bg-gray-900 p-8 border-2 border-green-600">
            <h2 className="text-3xl font-bold mb-6 text-center text-green-400">Send Payment</h2>

            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h3 className="font-bold mb-4 text-xl">Payment Instructions:</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Amount to send:</p>
                  <p className="text-3xl font-bold text-green-400">${priceInDollars.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Send to:</p>
                  <p className="text-2xl font-bold text-purple-400">{paymentHandles[paymentMethod]}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Method:</p>
                  <p className="text-xl font-bold capitalize">{paymentMethod}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/30 p-4 rounded-lg mb-6">
              <p className="text-sm text-yellow-200">
                ⚠️ <strong>Important:</strong> After sending payment, enter your confirmation code or transaction ID below.
                Your subscription will be activated once payment is verified.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Confirmation Code / Transaction ID *</label>
                <Input
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Enter confirmation code from payment app"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about your payment"
                  className="bg-gray-800 border-gray-700"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep("select")}
                  variant="outline"
                  className="flex-1"
                >
                  ← Back
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={!confirmationCode || createSubscription.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createSubscription.isPending ? "Confirming..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === "confirm" && (
          <Card className="bg-gray-900 p-8 border-2 border-green-600">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold mb-4 text-green-400">Payment Submitted!</h2>
              <p className="text-gray-300 mb-6">
                Your subscription is pending verification. You'll receive access once the creator confirms your payment.
              </p>
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-400">Confirmation Code:</p>
                <p className="text-xl font-bold text-purple-400">{confirmationCode}</p>
              </div>
              <Button
                onClick={() => (window.location.href = "/")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Return Home
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
