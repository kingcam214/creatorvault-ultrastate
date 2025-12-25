import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Video } from "lucide-react";

export default function VaultLiveSimple() {
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [currentStreamId, setCurrentStreamId] = useState<number | null>(null);

  // Get creator balance
  const { data: balance } = trpc.vaultLive.getCreatorBalance.useQuery(
    undefined,
    { enabled: !!user }
  );

  const createStreamMutation = trpc.vaultLive.createStream.useMutation({
    onSuccess: (stream) => {
      setCurrentStreamId(stream.id);
      setIsLive(true);
      toast.success("You're live!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const endStreamMutation = trpc.vaultLive.endStream.useMutation({
    onSuccess: () => {
      setIsLive(false);
      setCurrentStreamId(null);
      setStreamTitle("");
      toast.success("Stream ended");
    },
  });

  const sendTipMutation = trpc.vaultLive.sendManualTip.useMutation({
    onSuccess: () => {
      toast.success("Tip sent! Waiting for admin confirmation...");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGoLive = () => {
    if (!streamTitle.trim()) {
      toast.error("Please enter a stream title");
      return;
    }
    createStreamMutation.mutate({ title: streamTitle });
  };

  const handleEndStream = () => {
    if (currentStreamId) {
      endStreamMutation.mutate({ streamId: currentStreamId });
    }
  };

  const handleTip = () => {
    if (!currentStreamId) {
      toast.error("No active stream");
      return;
    }
    sendTipMutation.mutate({
      streamId: currentStreamId,
      amount: 500, // $5.00 in cents
    });
  };

  // Check if user has payout details
  const hasPayoutDetails = user?.cashappHandle || user?.paypalEmail;

  if (!hasPayoutDetails) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Please setup your payout details before going live
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/payout-setup">Setup Payout Details</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Creator Controls */}
      <Card>
        <CardHeader>
          <CardTitle>VaultLive - Creator Controls</CardTitle>
          <CardDescription>
            Simple validation flow for testing tips and payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLive ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Stream Title</Label>
                <Input
                  id="title"
                  placeholder="What are you streaming?"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleGoLive}
                disabled={createStreamMutation.isPending}
                className="w-full"
                size="lg"
              >
                <Video className="mr-2" />
                Go Live
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-500 text-white p-4 rounded-lg text-center font-bold">
                🔴 LIVE: {streamTitle}
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Share this link with fans:</p>
                <code className="text-sm bg-white dark:bg-gray-800 p-2 rounded block overflow-x-auto">
                  {window.location.origin}/stream/{currentStreamId}
                </code>
              </div>
              <Button 
                onClick={handleEndStream}
                disabled={endStreamMutation.isPending}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                End Stream
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fan Controls */}
      {isLive && (
        <Card>
          <CardHeader>
            <CardTitle>Fan View</CardTitle>
            <CardDescription>
              Fans can tip the creator during the stream
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTip}
              disabled={sendTipMutation.isPending}
              className="w-full"
              size="lg"
            >
              <DollarSign className="mr-2" />
              Tip $5
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Your Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                ${balance?.pending || "0.00"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Confirmed</div>
              <div className="text-2xl font-bold text-green-600">
                ${balance?.confirmed || "0.00"}
              </div>
            </div>
          </div>
          {balance && parseFloat(balance.confirmed) > 0 && (
            <div className="pt-4 border-t">
              <Button 
                onClick={() => toast.info("Payout request sent! Cameron will process your payment to " + (user?.cashappHandle || user?.paypalEmail))}
                className="w-full"
                size="lg"
              >
                <DollarSign className="mr-2" />
                Request Payout (${balance.confirmed})
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Payouts processed within 24 hours to your {user?.cashappHandle ? 'Cash App' : 'PayPal'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Payout Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {user?.cashappHandle && (
            <div>Cash App: <strong>{user.cashappHandle}</strong></div>
          )}
          {user?.paypalEmail && (
            <div>PayPal: <strong>{user.paypalEmail}</strong></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
