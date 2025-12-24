/**
 * KingCam Live Demo Control Dashboard
 * 
 * Real-time demo system for jaw-dropping creator onboarding
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Download, Share2, Sparkles } from "lucide-react";

export default function LiveDemoControl() {
  const [creatorHandle, setCreatorHandle] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "tiktok" | "youtube">("instagram");
  const [demoStep, setDemoStep] = useState<"idle" | "analyzing" | "generating" | "complete">("idle");
  const [demoData, setDemoData] = useState<any>(null);

  // Analyze creator profile
  const analyzeCreator = trpc.liveDemo.analyzeCreator.useMutation({
    onSuccess: (data) => {
      setDemoData(data);
      setDemoStep("complete");
    },
  });

  // Generate demo video
  const generateDemoVideo = trpc.liveDemo.generateDemoVideo.useMutation();

  // Generate earnings projection
  const projectEarnings = trpc.liveDemo.projectEarnings.useMutation();

  const startDemo = async () => {
    if (!creatorHandle) return;

    setDemoStep("analyzing");
    
    // Step 1: Analyze creator
    await analyzeCreator.mutateAsync({
      handle: creatorHandle,
      platform,
    });
  };

  const generateVideo = async () => {
    if (!demoData) return;

    setDemoStep("generating");
    
    await generateDemoVideo.mutateAsync({
      creatorId: demoData.id,
      style: demoData.contentStyle,
    });
    
    setDemoStep("complete");
  };

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-500" />
            KingCam Live Demo
          </h1>
          <p className="text-muted-foreground mt-2">
            Run jaw-dropping real-time demonstrations
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {demoStep === "idle" && "Ready"}
          {demoStep === "analyzing" && "Analyzing..."}
          {demoStep === "generating" && "Generating..."}
          {demoStep === "complete" && "Complete"}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Controls</CardTitle>
            <CardDescription>Enter creator info to start live demo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Creator Handle</Label>
              <Input
                placeholder="@username"
                value={creatorHandle}
                onChange={(e) => setCreatorHandle(e.target.value)}
                disabled={demoStep !== "idle"}
              />
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="flex gap-2">
                {(["instagram", "tiktok", "youtube"] as const).map((p) => (
                  <Button
                    key={p}
                    variant={platform === p ? "default" : "outline"}
                    onClick={() => setPlatform(p)}
                    disabled={demoStep !== "idle"}
                    className="flex-1 capitalize"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={startDemo}
              disabled={!creatorHandle || demoStep !== "idle"}
              className="w-full"
              size="lg"
            >
              {demoStep === "analyzing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Creator...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Live Demo
                </>
              )}
            </Button>

            {demoData && (
              <div className="pt-4 border-t space-y-3">
                <Button
                  onClick={generateVideo}
                  disabled={demoStep === "generating"}
                  className="w-full"
                  variant="secondary"
                >
                  {demoStep === "generating" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Demo Video
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Live Results</CardTitle>
            <CardDescription>Real-time analysis and projections</CardDescription>
          </CardHeader>
          <CardContent>
            {!demoData ? (
              <div className="py-12 text-center text-muted-foreground">
                Start a demo to see results
              </div>
            ) : (
              <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Followers</p>
                      <p className="text-2xl font-bold">{demoData.followers?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Engagement</p>
                      <p className="text-2xl font-bold">{demoData.engagementRate}%</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Content Style</p>
                      <p className="text-lg font-bold capitalize">{demoData.contentStyle}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Post Frequency</p>
                      <p className="text-lg font-bold">{demoData.postFrequency}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Monetization Potential
                    </p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                      ${demoData.monthlyPotential?.toLocaleString()}/month
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Currently leaving on the table
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="earnings" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">30-Day Projection</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        ${demoData.projections?.month1?.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">90-Day Projection</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${demoData.projections?.month3?.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">1-Year Projection</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        ${demoData.projections?.year1?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4 mt-4">
                  {demoData.generatedVideo ? (
                    <div className="space-y-4">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          src={demoData.generatedVideo.url}
                          controls
                          className="w-full h-full"
                        />
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Generated in real-time</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Optimized for {platform} • {demoData.contentStyle} style
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      Click "Generate Demo Video" to create content
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
