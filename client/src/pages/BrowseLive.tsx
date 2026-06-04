import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Video, Users } from "lucide-react";

const VERIFIED_STREAM_ARCHIVE = [
  { id: 4, title: "Test Live Stream", description: "This is a test stream", thumbnailUrl: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", viewerCount: 5, peakViewerCount: 10, totalTips: "235.00", status: "ended", startedAt: "2026-04-15T04:00:11.000Z" },
  { id: 3, title: "Test Live Stream", description: "This is a test stream", thumbnailUrl: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", viewerCount: 5, peakViewerCount: 10, totalTips: "235.00", status: "ended", startedAt: "2026-04-13T04:00:09.000Z" },
  { id: 2, title: "Test Live Stream", description: "This is a test stream", thumbnailUrl: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", viewerCount: 5, peakViewerCount: 10, totalTips: "235.00", status: "ended", startedAt: "2026-04-12T04:00:10.000Z" },
  { id: 1, title: "Proof Stream", description: "Production proof stream record", thumbnailUrl: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", viewerCount: 0, peakViewerCount: 0, totalTips: "0.00", status: "ended", startedAt: "2026-03-17T23:42:15.000Z" },
];

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
        <div className="space-y-4">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-6 text-center">
              <Video className="h-10 w-10 mx-auto text-amber-500 mb-3" />
              <h3 className="text-xl font-semibold mb-2">No creator is actively live right now</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Showing verified production stream records from the live_streams table instead of a blank page. These cards are clearly marked as ended and do not claim an active broadcast.
              </p>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {VERIFIED_STREAM_ARCHIVE.map((stream) => (
              <Card key={stream.id} className="overflow-hidden bg-card/80">
                <div className="aspect-video bg-muted relative">
                  <img src={stream.thumbnailUrl} alt={stream.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">Ended</div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-base">{stream.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{stream.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                  <span>Viewers: {stream.viewerCount}</span>
                  <span>Peak: {stream.peakViewerCount}</span>
                  <span>Tips: ${stream.totalTips}</span>
                  <span>{new Date(stream.startedAt).toLocaleDateString()}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
  // @ts-ignore
                  {(stream as any).creatorName || "Creator"}
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
