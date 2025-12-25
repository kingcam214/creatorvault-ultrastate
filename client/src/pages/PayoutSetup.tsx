import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function PayoutSetup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [cashappHandle, setCashappHandle] = useState(user?.cashappHandle || "");
  const [paypalEmail, setPaypalEmail] = useState(user?.paypalEmail || "");

  const updatePayoutMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Payout details saved!");
      setLocation("/vaultlive");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cashappHandle && !paypalEmail) {
      toast.error("Please enter at least one payout method");
      return;
    }

    updatePayoutMutation.mutate({
      cashappHandle: cashappHandle || undefined,
      paypalEmail: paypalEmail || undefined,
    });
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Payout Setup</CardTitle>
          <CardDescription>
            Enter your payout details to receive earnings from VaultLive tips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cashapp">Cash App Handle (optional)</Label>
              <Input
                id="cashapp"
                placeholder="$YourCashApp"
                value={cashappHandle}
                onChange={(e) => setCashappHandle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paypal">PayPal Email (optional)</Label>
              <Input
                id="paypal"
                type="email"
                placeholder="your@email.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={updatePayoutMutation.isPending}
            >
              {updatePayoutMutation.isPending ? "Saving..." : "Save & Continue to VaultLive"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
