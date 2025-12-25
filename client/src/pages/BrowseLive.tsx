import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Video, Users } from "lucide-react";

export default function BrowseLive() {
  const [, setLocation] = useLocation();
  const { data: liveStreams, isLoading } = trpc.vaultLive.getLiveStreams.useQuery();

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <p className="text-center text-muted-foreground">Loading live streams...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">🔴 Live Now</h1>
        <p className="text-xl text-muted-foreground">
          Watch creators and support them with tips
        </p>
      </div>

      {!liveStreams || liveStreams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No one is live right now</h3>
            <p className="text-muted-foreground">
              Check back later or be the first to go live!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveStreams.map((stream) => (
            <Card key={stream.id} className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/stream/${stream.id}`)}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-red-500">LIVE</span>
                </div>
                <CardTitle className="line-clamp-2">{stream.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {stream.creatorName || "Creator"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setLocation(`/stream/${stream.id}`)}>
                  Watch & Tip
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
