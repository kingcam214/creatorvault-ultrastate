/**
 * Podcast Studio
 * 
 * Complete podcast management:
 * - Create shows and episodes
 * - Distribute to Apple/Spotify
 * - Monetize with ads and sponsors
 * - View analytics and growth
 * - Process audio (enhance, clip, waveform)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function PodcastStudio() {
  const [showDialog, setShowDialog] = useState<"show" | "episode" | null>(null);
  const [selectedShow, setSelectedShow] = useState<number | null>(null);

  // Form states
  const [showTitle, setShowTitle] = useState("");
  const [showDescription, setShowDescription] = useState("");
  const [showCategory, setShowCategory] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeDescription, setEpisodeDescription] = useState("");
  const [episodeAudioUrl, setEpisodeAudioUrl] = useState("");
  const [episodeDuration, setEpisodeDuration] = useState("");

  const { data: shows, refetch: refetchShows } = trpc.podcastStudio.getMyShows.useQuery();
  const { data: episodes, refetch: refetchEpisodes } = trpc.podcastStudio.getEpisodes.useQuery(
    { podcastId: selectedShow! },
    { enabled: !!selectedShow }
  );
  const { data: analytics } = trpc.podcastStudio.getAnalytics.useQuery(
    { podcastId: selectedShow! },
    { enabled: !!selectedShow }
  );

  const createShowMutation = trpc.podcastStudio.createShow.useMutation({
    onSuccess: () => {
      toast.success("Podcast show created");
      setShowDialog(null);
      setShowTitle("");
      setShowDescription("");
      setShowCategory("");
      refetchShows();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createEpisodeMutation = trpc.podcastStudio.createEpisode.useMutation({
    onSuccess: () => {
      toast.success("Episode created");
      setShowDialog(null);
      setEpisodeTitle("");
      setEpisodeDescription("");
      setEpisodeAudioUrl("");
      setEpisodeDuration("");
      refetchEpisodes();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const submitToAppleMutation = trpc.podcastStudio.submitToApple.useMutation({
    onSuccess: () => {
      toast.success("Submitted to Apple Podcasts");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const submitToSpotifyMutation = trpc.podcastStudio.submitToSpotify.useMutation({
    onSuccess: () => {
      toast.success("Submitted to Spotify");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateShow = () => {
    if (!showTitle || !showDescription || !showCategory) {
      toast.error("Please fill all fields");
      return;
    }

    createShowMutation.mutate({
      title: showTitle,
      description: showDescription,
      category: showCategory,
    });
  };

  const handleCreateEpisode = () => {
    if (!selectedShow || !episodeTitle || !episodeDescription || !episodeAudioUrl || !episodeDuration) {
      toast.error("Please fill all fields");
      return;
    }

    createEpisodeMutation.mutate({
      podcastId: selectedShow,
      title: episodeTitle,
      description: episodeDescription,
      audioUrl: episodeAudioUrl,
      duration: parseInt(episodeDuration),
    });
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Podcast Studio</h1>
          <p className="text-muted-foreground mt-2">
            Create, distribute, and monetize your podcasts
          </p>
        </div>
        <Button onClick={() => setShowDialog("show")}>
          + Create Podcast Show
        </Button>
      </div>

      {!shows || shows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-bold mb-2">No Podcast Shows Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first podcast show to get started
            </p>
            <Button onClick={() => setShowDialog("show")}>
              + Create Podcast Show
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Show Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shows.map((show: any) => (
              <Card
                key={show.id}
                className={`cursor-pointer transition-all ${
                  selectedShow === show.id ? "ring-2 ring-purple-600" : ""
                }`}
                onClick={() => setSelectedShow(show.id)}
              >
                <CardHeader>
                  <CardTitle>{show.title}</CardTitle>
                  <CardDescription>{show.category}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {show.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Show Details */}
          {selectedShow && (
            <Tabs defaultValue="episodes" className="space-y-6">
              <TabsList>
                <TabsTrigger value="episodes">Episodes</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="monetization">Monetization</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="audio">Audio Tools</TabsTrigger>
              </TabsList>

              {/* Episodes Tab */}
              <TabsContent value="episodes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Episodes</h2>
                  <Button onClick={() => setShowDialog("episode")}>
                    + Add Episode
                  </Button>
                </div>

                {!episodes || episodes.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No episodes yet. Add your first episode to get started.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {episodes.map((episode: any) => (
                      <Card key={episode.id}>
                        <CardHeader>
                          <CardTitle>{episode.title}</CardTitle>
                          <CardDescription>
                            Duration: {Math.floor(episode.duration / 60)}:{(episode.duration % 60).toString().padStart(2, "0")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{episode.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Distribution Tab */}
              <TabsContent value="distribution" className="space-y-4">
                <h2 className="text-2xl font-bold">Distribution</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Apple Podcasts</CardTitle>
                      <CardDescription>Submit your podcast to Apple Podcasts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => submitToAppleMutation.mutate({ podcastId: selectedShow })}
                        disabled={submitToAppleMutation.isPending}
                        className="w-full"
                      >
                        {submitToAppleMutation.isPending ? "Submitting..." : "Submit to Apple Podcasts"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Spotify</CardTitle>
                      <CardDescription>Submit your podcast to Spotify</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => submitToSpotifyMutation.mutate({ podcastId: selectedShow })}
                        disabled={submitToSpotifyMutation.isPending}
                        className="w-full"
                      >
                        {submitToSpotifyMutation.isPending ? "Submitting..." : "Submit to Spotify"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Monetization Tab */}
              <TabsContent value="monetization" className="space-y-4">
                <h2 className="text-2xl font-bold">Monetization</h2>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Dynamic Ad Insertion</CardTitle>
                    <CardDescription>Insert ads into your episodes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Coming soon: Automatically insert pre-roll, mid-roll, and post-roll ads
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sponsor Matching</CardTitle>
                    <CardDescription>Find sponsors for your podcast</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Coming soon: AI-powered sponsor matching based on your content
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <h2 className="text-2xl font-bold">Analytics</h2>
                
                {analytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Total Listens</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analytics.totalListens || 0}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{analytics.subscribers || 0}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">${(analytics.revenue || 0).toFixed(2)}</div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No analytics data yet
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Audio Tools Tab */}
              <TabsContent value="audio" className="space-y-4">
                <h2 className="text-2xl font-bold">Audio Tools</h2>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Audio Enhancement</CardTitle>
                    <CardDescription>Improve audio quality with noise reduction and normalization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Coming soon: AI-powered audio enhancement
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Clip Extraction</CardTitle>
                    <CardDescription>Extract short clips for social media</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Coming soon: Extract viral clips from your episodes
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {/* Create Show Dialog */}
      <Dialog open={showDialog === "show"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Podcast Show</DialogTitle>
            <DialogDescription>
              Create a new podcast show to start publishing episodes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Show Title *</Label>
              <Input
                value={showTitle}
                onChange={(e) => setShowTitle(e.target.value)}
                placeholder="My Awesome Podcast"
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Input
                value={showCategory}
                onChange={(e) => setShowCategory(e.target.value)}
                placeholder="Technology, Business, Comedy, etc."
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={showDescription}
                onChange={(e) => setShowDescription(e.target.value)}
                placeholder="Describe your podcast..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateShow}
              disabled={createShowMutation.isPending}
            >
              {createShowMutation.isPending ? "Creating..." : "Create Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Episode Dialog */}
      <Dialog open={showDialog === "episode"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Episode</DialogTitle>
            <DialogDescription>
              Add a new episode to your podcast
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Episode Title *</Label>
              <Input
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                placeholder="Episode 1: Introduction"
              />
            </div>

            <div>
              <Label>Audio URL *</Label>
              <Input
                value={episodeAudioUrl}
                onChange={(e) => setEpisodeAudioUrl(e.target.value)}
                placeholder="https://storage.example.com/episode1.mp3"
              />
            </div>

            <div>
              <Label>Duration (seconds) *</Label>
              <Input
                type="number"
                value={episodeDuration}
                onChange={(e) => setEpisodeDuration(e.target.value)}
                placeholder="3600"
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={episodeDescription}
                onChange={(e) => setEpisodeDescription(e.target.value)}
                placeholder="Episode description..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEpisode}
              disabled={createEpisodeMutation.isPending}
            >
              {createEpisodeMutation.isPending ? "Adding..." : "Add Episode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
