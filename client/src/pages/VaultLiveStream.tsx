import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { io, Socket } from "socket.io-client";
import SimplePeer from "simple-peer";
import { Video, VideoOff, Mic, MicOff, Users, DollarSign, Target } from "lucide-react";

export default function VaultLiveStream() {
  const { user, isAuthenticated } = useAuth();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const currentStreamIdRef = useRef<number | null>(null);

  const createStreamMutation = trpc.vaultLive.createStream.useMutation();
  const endStreamMutation = trpc.vaultLive.endStream.useMutation();

  useEffect(() => {
    // Connect to WebRTC signaling server
    const socket = io({
      path: '/socket.io/',
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[VaultLive] Connected to signaling server');
    });

    socket.on('viewer-joined', ({ viewerId, viewerCount: count }: { viewerId: string; viewerCount: number }) => {
      console.log('[VaultLive] Viewer joined:', viewerId);
      setViewerCount(count);

      // Create peer connection for new viewer
      if (streamRef.current) {
        createPeerConnection(viewerId, true);
      }
    });

    socket.on('viewer-left', ({ viewerId, viewerCount: count }: { viewerId: string; viewerCount: number }) => {
      console.log('[VaultLive] Viewer left:', viewerId);
      setViewerCount(count);

      // Clean up peer connection
      const peer = peersRef.current.get(viewerId);
      if (peer) {
        peer.destroy();
        peersRef.current.delete(viewerId);
      }
    });

    socket.on('webrtc-answer', ({ fromSocketId, answer }: { fromSocketId: string; answer: any }) => {
      const peer = peersRef.current.get(fromSocketId);
      if (peer) {
        peer.signal(answer);
      }
    });

    socket.on('webrtc-ice-candidate', ({ fromSocketId, candidate }: { fromSocketId: string; candidate: any }) => {
      const peer = peersRef.current.get(fromSocketId);
      if (peer) {
        peer.signal(candidate);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createPeerConnection = (viewerId: string, initiator: boolean) => {
    if (!streamRef.current) return;

    const peer = new SimplePeer({
      initiator,
      stream: streamRef.current,
      trickle: true,
    });

    peer.on('signal', (signal) => {
      if (socketRef.current) {
        if (initiator) {
          socketRef.current.emit('webrtc-offer', {
            targetSocketId: viewerId,
            offer: signal,
          });
        } else {
          socketRef.current.emit('webrtc-answer', {
            targetSocketId: viewerId,
            answer: signal,
          });
        }
      }
    });

    peer.on('error', (err) => {
      console.error('[VaultLive] Peer error:', err);
    });

    peersRef.current.set(viewerId, peer);
  };

  const startBroadcast = async () => {
    if (!streamTitle.trim()) {
      toast.error("Please enter a stream title");
      return;
    }

    try {
      // Get user media (camera + microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      streamRef.current = stream;

      // Display local preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create stream in database
      const result = await createStreamMutation.mutateAsync({
        title: streamTitle,
      });

      currentStreamIdRef.current = result.id;

      // Start WebRTC broadcast
      if (socketRef.current && user) {
        socketRef.current.emit('start-broadcast', {
          streamId: result.id,
          userId: user.id,
        });
      }

      setIsBroadcasting(true);
      toast.success("Stream started!");
    } catch (error) {
      console.error('[VaultLive] Start broadcast error:', error);
      toast.error("Failed to start stream. Please check camera/microphone permissions.");
    }
  };

  const endBroadcast = async () => {
    try {
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Clear video preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Destroy all peer connections
      peersRef.current.forEach(peer => peer.destroy());
      peersRef.current.clear();

      // End WebRTC broadcast
      if (socketRef.current && currentStreamIdRef.current) {
        socketRef.current.emit('end-broadcast', {
          streamId: currentStreamIdRef.current,
        });

        // End stream in database
        await endStreamMutation.mutateAsync({
          streamId: currentStreamIdRef.current,
        });
      }

      setIsBroadcasting(false);
      setViewerCount(0);
      setStreamTitle("");
      currentStreamIdRef.current = null;
      toast.success("Stream ended");
    } catch (error) {
      console.error('[VaultLive] End broadcast error:', error);
      toast.error("Failed to end stream");
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container max-w-4xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>VaultLive - HD Live Streaming</CardTitle>
            <CardDescription>Please log in to start streaming</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">VaultLive</h1>
        <p className="text-muted-foreground">HD live streaming with token economy</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main streaming area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isBroadcasting ? "Live Stream" : "Start Broadcasting"}</CardTitle>
              <CardDescription>
                {isBroadcasting ? "You're live! Viewers can see and hear you." : "Set up your stream and go live"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isBroadcasting && (
                <div className="space-y-2">
                  <Label htmlFor="streamTitle">Stream Title</Label>
                  <Input
                    id="streamTitle"
                    placeholder="What are you streaming today?"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                  />
                </div>
              )}

              {/* Video preview */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isBroadcasting && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <Video className="w-16 h-16" />
                  </div>
                )}
              </div>

              {/* Stream controls */}
              <div className="flex gap-2">
                {!isBroadcasting ? (
                  <Button onClick={startBroadcast} className="flex-1" size="lg">
                    Go Live
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={toggleVideo}
                      variant={videoEnabled ? "default" : "destructive"}
                      size="lg"
                    >
                      {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </Button>
                    <Button
                      onClick={toggleAudio}
                      variant={audioEnabled ? "default" : "destructive"}
                      size="lg"
                    >
                      {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </Button>
                    <Button onClick={endBroadcast} variant="destructive" className="flex-1" size="lg">
                      End Stream
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Live Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Viewers</div>
                <div className="text-3xl font-bold">{viewerCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Tips Today</div>
                <div className="text-3xl font-bold flex items-center gap-1">
                  <DollarSign className="w-6 h-6" />
                  {totalTips}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Your Earnings (85%)</div>
                <div className="text-2xl font-bold text-green-600">
                  ${(totalTips * 0.85).toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {isBroadcasting && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Stream Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Set a goal to engage viewers</div>
                  <Button variant="outline" className="w-full">
                    Set Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
