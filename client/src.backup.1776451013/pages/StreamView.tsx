import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, Video } from "lucide-react";

export default function StreamView() {
  const [, params] = useRoute("/stream/:id");
  const streamId = params?.id ? parseInt(params.id) : null;

  const { data: stream, isLoading } = trpc.vaultLive.getStream.useQuery(
    { streamId: streamId! },
    { enabled: !!streamId }
  );

  const sendTipMutation = trpc.vaultLive.sendManualTip.useMutation({
    onSuccess: () => {
      toast.success("Tip sent! The creator will receive it after admin confirmation.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleTip = () => {
    if (!streamId) return;
    sendTipMutation.mutate({
      streamId,
      amount: 500, // $5.00 in cents
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <p className="text-center text-muted-foreground">Loading stream...</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Stream not found</h3>
            <p className="text-muted-foreground">
              This stream may have ended or doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLive = stream.status === "live";

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Stream Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {isLive ? (
              <>
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-red-500">LIVE</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">OFFLINE</span>
            )}
          </div>
          <CardTitle className="text-3xl">{stream.title}</CardTitle>
          <CardDescription className="text-lg">
            by {stream.creatorName || "Creator"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-pink-950 rounded-lg p-12 text-center">
            <Video className="h-24 w-24 mx-auto text-purple-600 mb-4" />
            <p className="text-muted-foreground">
              {isLive ? "Stream is live! Video player coming soon." : "This stream has ended."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tip Section */}
      {isLive && (
        <Card>
          <CardHeader>
            <CardTitle>Support This Creator</CardTitle>
            <CardDescription>
              Send a tip to show your support. Creator keeps 85%!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTip}
              disabled={sendTipMutation.isPending}
              className="w-full"
              size="lg"
            >
              <DollarSign className="mr-2" />
              Tip $5
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Creator receives $4.25 • Platform fee $0.75
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
