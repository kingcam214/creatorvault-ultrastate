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
  const [, params] = useRoute<{ creatorId: string }>("/subscribe/:creatorId");
  const { user } = useAuth();
  const { toast } = useToast();
  const routeId = params?.creatorId ? parseInt(params.creatorId) : 0;

  const [step, setStep] = useState<"select" | "instructions" | "confirm">("select");
  const [paymentMethod, setPaymentMethod] = useState<"cashapp" | "zelle" | "applepay" | "venmo" | "paypal" | "">("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [notes, setNotes] = useState("");

  // Route supports the public /subscribe/:creatorId path and safely falls back when an older tier link is shared.
  const { data: creatorTiers, isLoading: tiersLoading } = trpc.subscriptions.getCreatorTiers.useQuery(
    { creatorId: routeId },
    { enabled: routeId > 0 }
  );
  const { data: tierById, isLoading: tierLoading } = trpc.subscriptions.getTier.useQuery(
    { tierId: routeId },
    { enabled: routeId > 0 }
  );
  const tier = creatorTiers?.[0] ?? tierById ?? null;
  const isLoading = tiersLoading || tierLoading;

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

  const paymentHandles = {
    cashapp: "$KingCam",
    zelle: "kingcam@creatorvault.com",
    applepay: "kingcam@creatorvault.com",
    venmo: "@KingCam",
    paypal: "kingcam@creatorvault.com",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black px-4 py-6 text-white sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-3xl border border-purple-400/30 bg-black/35 p-5 text-center shadow-2xl">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-purple-200">Secure manual unlock</p>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">Subscribe to {(tier as any).creatorName || "Creator"}</h1>
          <p className="mt-3 text-sm leading-6 text-gray-300">Choose a payment app, send the exact amount, then submit the transaction ID so access can be verified.</p>
        </div>

        {step === "select" && (
          <Card className="border-2 border-purple-600 bg-gray-900 p-5 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{tier.name}</h2>
              <p className="mb-4 text-4xl font-bold text-purple-400 sm:text-5xl">
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
                className="min-h-14 w-full bg-purple-600 text-lg font-bold hover:bg-purple-700 sm:text-xl"
              >
                Log In to Subscribe
              </Button>
            ) : (
              <div className="space-y-3">
                <h3 className="mb-4 text-center font-bold">Choose payment method and keep the app receipt:</h3>
                <Button
                  onClick={() => handlePaymentMethodSelect("cashapp")}
                  className="min-h-13 w-full bg-green-600 py-5 text-base font-bold hover:bg-green-700"
                >
                  💵 CashApp
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("zelle")}
                  className="min-h-13 w-full bg-purple-600 py-5 text-base font-bold hover:bg-purple-700"
                >
                  💳 Zelle
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("applepay")}
                  className="min-h-13 w-full bg-gray-700 py-5 text-base font-bold hover:bg-gray-800"
                >
                  🍎 Apple Pay
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("venmo")}
                  className="min-h-13 w-full bg-blue-600 py-5 text-base font-bold hover:bg-blue-700"
                >
                  💙 Venmo
                </Button>
                <Button
                  onClick={() => handlePaymentMethodSelect("paypal")}
                  className="min-h-13 w-full bg-blue-500 py-5 text-base font-bold hover:bg-blue-600"
                >
                  🌐 PayPal
                </Button>
              </div>
            )}
          </Card>
        )}

        {step === "instructions" && paymentMethod && (
          <Card className="border-2 border-green-600 bg-gray-900 p-5 sm:p-8">
            <h2 className="mb-6 text-center text-2xl font-bold text-green-400 sm:text-3xl">Send payment, then verify</h2>

            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h3 className="font-bold mb-4 text-xl">Payment Instructions:</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Amount to send:</p>
                  <p className="text-3xl font-bold text-green-400">${priceInDollars.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Send to:</p>
                  <p className="break-all text-2xl font-bold text-purple-400">{paymentHandles[paymentMethod]}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Method:</p>
                  <p className="text-xl font-bold capitalize">{paymentMethod}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/30 p-4 rounded-lg mb-6">
              <p className="text-sm text-yellow-200">
                <strong>Important:</strong> Send the exact amount, copy the payment app confirmation code, and paste it below. Access stays pending until the creator verifies the payment.
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

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => setStep("select")}
                  variant="outline"
                  className="min-h-12"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={!confirmationCode || createSubscription.isPending}
                  className="min-h-12 bg-green-600 font-bold hover:bg-green-700"
                >
                  {createSubscription.isPending ? "Confirming..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === "confirm" && (
          <Card className="border-2 border-green-600 bg-gray-900 p-5 sm:p-8">
            <div className="text-center">
              <div className="mb-4 text-5xl font-black text-green-400">OK</div>
              <h2 className="mb-4 text-2xl font-bold text-green-400 sm:text-3xl">Payment submitted for verification</h2>
              <p className="text-gray-300 mb-6">
                Your subscription is pending verification. Keep this code saved; access turns on after the creator confirms the payment.
              </p>
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-400">Confirmation Code:</p>
                <p className="text-xl font-bold text-purple-400">{confirmationCode}</p>
              </div>
              <Button
                onClick={() => (window.location.href = "/")}
                className="min-h-12 w-full bg-purple-600 font-bold hover:bg-purple-700 sm:w-auto"
              >
                Return home
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
