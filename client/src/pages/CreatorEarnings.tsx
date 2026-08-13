/**
 * Creator Earnings Dashboard
 * 
 * Shows balance, payout history, and payout request form
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CreatorEarnings() {
  const [payoutAmount, setPayoutAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cashapp" | "zelle" | "bank_transfer" | "paypal" | "telegram_stars" | "ton_wallet" | "wise" | "payoneer" | "manual_cash">("cashapp");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [requestedMode, setRequestedMode] = useState<"instant" | "standard">("instant");

  const { data: balance, refetch: refetchBalance } = trpc.payouts.getMyBalance.useQuery();
  const { data: payouts, refetch: refetchPayouts } = trpc.payouts.getMyPayouts.useQuery();
  const { data: payoutRails } = trpc.payouts.getRails.useQuery();
  
  const requestPayoutMutation = trpc.payouts.requestPayout.useMutation({
    onSuccess: () => {
      toast.success("Your cash-out request is in. Fast payment options start moving right away when available.");
      setPayoutAmount("");
      setPaymentDetails("");
      refetchBalance();
      refetchPayouts();
    },
    onError: () => {
      toast.error("We could not start this cash-out. Check your payment details and try again.");
    },
  });

  const handleRequestPayout = () => {
    const amountInCents = Math.floor(parseFloat(payoutAmount) * 100);
    
    if (isNaN(amountInCents) || amountInCents < 1000) {
      toast.error("Minimum payout is $10.00");
      return;
    }

    if (!paymentDetails.trim()) {
      toast.error("Please provide payment details");
      return;
    }

    requestPayoutMutation.mutate({
      amountInCents,
      paymentMethod,
      paymentDetails,
      requestedMode,
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const payoutStatusLabel = (status?: string) => {
    if (status === "completed") return "Paid";
    if (status === "processing") return "On its way";
    if (status === "rejected") return "Needs attention";
    return "Waiting for review";
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Creator Earnings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your balance and request payouts
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {balance ? formatCurrency(balance.availableBalanceInCents) : "$0.00"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {balance ? formatCurrency(balance.pendingBalanceInCents) : "$0.00"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Cash-outs on the way
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lifetime Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {balance ? formatCurrency(balance.lifetimeEarningsInCents) : "$0.00"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>
            Minimum cash-out: $10.00 • Cash App, Zelle, TON, Wise, PayPal, and Stars are ready when available
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="10"
                placeholder="10.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashapp">Cash App — instant</SelectItem>
                  <SelectItem value="zelle">Zelle — instant</SelectItem>
                  <SelectItem value="ton_wallet">TON Wallet — near-instant</SelectItem>
                  <SelectItem value="telegram_stars">Telegram Stars Credit</SelectItem>
                  <SelectItem value="wise">Wise — same day/global</SelectItem>
                  <SelectItem value="paypal">PayPal — same day</SelectItem>
                  <SelectItem value="payoneer">Payoneer — global</SelectItem>
                  <SelectItem value="manual_cash">Manual / Cash Settlement</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer — standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode">How fast do you need it?</Label>
            <Select value={requestedMode} onValueChange={(v) => setRequestedMode(v as any)}>
              <SelectTrigger id="mode"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant / fastest available rail</SelectItem>
                <SelectItem value="standard">Standard timing</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Fast cash-out requests move first when available and close once your payment confirmation is attached.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Payment Details</Label>
            <Textarea
              id="details"
              placeholder="Enter destination details: $cashtag, Zelle email/phone, TON wallet, Wise/PayPal/Payoneer email, Stars handle, or bank details"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleRequestPayout}
            disabled={requestPayoutMutation.isPending}
            className="w-full"
          >
            {requestPayoutMutation.isPending ? "Sending your request..." : "Request Cash-Out"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash-Out Options</CardTitle>
          <CardDescription>Choose the payment option that gets your money where you need it. Every completed payment is matched to its confirmation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(payoutRails?.allRails || balance?.rails?.allRails || []).map((rail: any) => (
              <div key={rail.key} className="border rounded-lg p-3 space-y-1">
                <div className="font-semibold">{rail.label}</div>
                <div className="text-xs text-muted-foreground">{rail.expectedSpeed}</div>
                <div className="text-xs text-muted-foreground">Payment confirmation: {rail.proofRequired}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {!payouts || payouts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No payout requests yet
            </p>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout: any) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{formatCurrency(payout.amountInCents)}</div>
                    <div className="text-sm text-muted-foreground">
                      {payout.paymentMethod} • {formatDate(payout.requestedAt)}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    payout.status === "completed" ? "bg-green-100 text-green-800" :
                    payout.status === "processing" ? "bg-yellow-100 text-yellow-800" :
                    payout.status === "rejected" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {payoutStatusLabel(payout.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
