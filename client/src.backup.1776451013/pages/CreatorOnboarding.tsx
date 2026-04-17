import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { CheckCircle2, DollarSign, Video, Users } from "lucide-react";

export default function CreatorOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [cashappHandle, setCashappHandle] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  const updatePayoutMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Payout details saved!");
      setStep(2);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePayoutSubmit = (e: React.FormEvent) => {
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

  if (!user) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>Please login to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/api/oauth/login"}>
              Login with Manus
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600">
      <div className="container max-w-4xl py-12">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to CreatorVault 🎉
          </h1>
          <p className="text-xl text-purple-100">
            Start earning 85% of everything you make
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-purple-300'}`}>
            {step > 1 ? <CheckCircle2 className="h-6 w-6" /> : <span className="h-6 w-6 rounded-full bg-white text-purple-600 flex items-center justify-center font-bold">1</span>}
            <span className="hidden sm:inline">Setup Payout</span>
          </div>
          <div className="h-0.5 w-12 bg-purple-300 self-center" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-white' : 'text-purple-300'}`}>
            {step > 2 ? <CheckCircle2 className="h-6 w-6" /> : <span className="h-6 w-6 rounded-full bg-purple-300 text-purple-600 flex items-center justify-center font-bold">2</span>}
            <span className="hidden sm:inline">Go Live</span>
          </div>
        </div>

        {/* Step 1: Payout Setup */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-purple-600" />
                Step 1: How do you want to get paid?
              </CardTitle>
              <CardDescription>
                Enter your Cash App or PayPal so we can send you money
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayoutSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cashapp">Cash App Handle</Label>
                  <Input
                    id="cashapp"
                    placeholder="$YourCashApp"
                    value={cashappHandle}
                    onChange={(e) => setCashappHandle(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Example: $JohnDoe
                  </p>
                </div>

                <div className="text-center text-sm text-muted-foreground">OR</div>

                <div className="space-y-2">
                  <Label htmlFor="paypal">PayPal Email</Label>
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
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                  disabled={updatePayoutMutation.isPending}
                >
                  {updatePayoutMutation.isPending ? "Saving..." : "Continue →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Ready to Go Live */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-6 w-6 text-purple-600" />
                You're All Set! 🎉
              </CardTitle>
              <CardDescription>
                Here's what you can do now
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Feature Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-2">
                  <Video className="h-8 w-8 text-purple-600" />
                  <h3 className="font-semibold">Go Live</h3>
                  <p className="text-sm text-muted-foreground">
                    Start streaming and receive tips from fans
                  </p>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <h3 className="font-semibold">Keep 85%</h3>
                  <p className="text-sm text-muted-foreground">
                    Every $5 tip = $4.25 for you
                  </p>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <Users className="h-8 w-8 text-blue-600" />
                  <h3 className="font-semibold">Build Your Audience</h3>
                  <p className="text-sm text-muted-foreground">
                    Fans can find you on the Browse Live page
                  </p>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-purple-600" />
                  <h3 className="font-semibold">Get Paid Fast</h3>
                  <p className="text-sm text-muted-foreground">
                    Request payouts anytime from your dashboard
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                  onClick={() => setLocation("/vaultlive")}
                >
                  <Video className="mr-2" />
                  Go Live Now
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/creator")}
                >
                  Go to Dashboard
                </Button>
              </div>

              {/* Quick Tips */}
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">💡 Quick Tips:</h4>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Share your stream link with fans on social media</li>
                  <li>Tips are confirmed by admin (Cameron) during testing</li>
                  <li>Check your balance anytime in VaultLive</li>
                  <li>Request payout when you're ready to cash out</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
