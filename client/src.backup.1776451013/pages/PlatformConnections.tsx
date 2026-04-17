import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Users,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PLATFORMS = [
  {
    id: "tiktok",
    name: "TikTok",
    description: "Post videos and shorts to TikTok",
    color: "bg-black",
    icon: "🎵",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share photos, videos, reels, and stories",
    color: "bg-gradient-to-br from-purple-600 to-pink-500",
    icon: "📷",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Upload videos and YouTube Shorts",
    color: "bg-red-600",
    icon: "▶️",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    description: "Post tweets with text, images, and videos",
    color: "bg-blue-500",
    icon: "🐦",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Share posts to your Facebook page",
    color: "bg-blue-700",
    icon: "👥",
  },
] as const;

export function PlatformConnections() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const { data: connectionStatus, isLoading } = trpc.oauthCallback.getConnectionStatus.useQuery();

  const getAuthUrlMutation = trpc.oauthCallback.getAuthUrl.useMutation({
    onSuccess: (data) => {
      // Open OAuth authorization URL in new window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        data.authUrl,
        "oauth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for OAuth callback
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          setConnectingPlatform(null);
          utils.oauthCallback.getConnectionStatus.invalidate();
          utils.platformPosting.getConnectedPlatforms.invalidate();
        }
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
      setConnectingPlatform(null);
    },
  });

  const disconnectMutation = trpc.platformPosting.disconnectPlatform.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Platform disconnected",
        description: `${data.platform} has been disconnected`,
      });
      utils.oauthCallback.getConnectionStatus.invalidate();
      utils.platformPosting.getConnectedPlatforms.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Disconnect failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnect = (platformId: string) => {
    setConnectingPlatform(platformId);
    getAuthUrlMutation.mutate({ platform: platformId as any });
  };

  const handleDisconnect = (platformId: string) => {
    disconnectMutation.mutate({ platform: platformId as any });
  };

  const formatFollowerCount = (count: number | null | undefined) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const isTokenExpired = (expiresAt: Date | null | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Platform Connections</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts to enable multi-platform posting, scheduling, and analytics.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {PLATFORMS.map((platform) => {
            const status = connectionStatus?.find((s) => s.platform === platform.id);
            const isConnected = status?.connected || false;
            const isExpired = isTokenExpired(status?.tokenExpiresAt);
            const isConnecting = connectingPlatform === platform.id;

            return (
              <Card key={platform.id} className={isConnected && !isExpired ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center text-2xl`}>
                        {platform.icon}
                      </div>
                      <div>
                        <CardTitle>{platform.name}</CardTitle>
                        <CardDescription>{platform.description}</CardDescription>
                      </div>
                    </div>
                    {isConnected && !isExpired ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : isExpired ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Not connected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isConnected && status ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {status.username && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Account:</span>
                            <span className="font-medium">@{status.username}</span>
                          </div>
                        )}
                        {status.followerCount !== null && status.followerCount !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Followers:</span>
                            <span className="font-medium flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {formatFollowerCount(status.followerCount)}
                            </span>
                          </div>
                        )}
                        {status.connectedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Connected:</span>
                            <span className="font-medium">
                              {format(new Date(status.connectedAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                        {status.tokenExpiresAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Token expires:</span>
                            <span className={`font-medium ${isExpired ? "text-destructive" : ""}`}>
                              {format(new Date(status.tokenExpiresAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isExpired && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConnect(platform.id)}
                            disabled={isConnecting}
                            className="flex-1"
                          >
                            {isConnecting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Reconnecting...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Reconnect
                              </>
                            )}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={disconnectMutation.isPending}
                              className={isExpired ? "" : "flex-1"}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Disconnect
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect {platform.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will revoke access to your {platform.name} account. You won't be able to post
                                content or view analytics until you reconnect.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDisconnect(platform.id)}>
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnecting}
                      className="w-full"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect {platform.name}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How to connect platforms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">1. Click "Connect" on a platform</h4>
            <p>You'll be redirected to the platform's authorization page in a new window.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">2. Authorize CreatorVault</h4>
            <p>Log in to your account and grant CreatorVault permission to post content and read analytics.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">3. Start posting!</h4>
            <p>
              Once connected, you can post content to multiple platforms at once from the Multi-Platform Posting page.
            </p>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs">
              <strong>Note:</strong> OAuth apps must be configured for each platform before connections work. Contact
              support if you encounter issues.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
