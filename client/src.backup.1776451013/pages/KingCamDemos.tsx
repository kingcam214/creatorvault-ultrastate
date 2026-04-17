/**
 * 🦁 KINGCAM DEMOS
 * 
 * Autonomous content generation and demo library
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Play, Trash2, Video } from "lucide-react";

export default function KingCamDemos() {
  const [topic, setTopic] = useState("");
  const [sector, setSector] = useState<"dominican" | "adult" | "general">("general");
  const [filterSector, setFilterSector] = useState<"dominican" | "adult" | "general" | "all">("all");

  const { data: demosData, refetch: refetchDemos } = trpc.kingcamDemos.getAll.useQuery({
    sector: filterSector,
  });

  const generateMutation = trpc.kingcamDemos.generate.useMutation({
    onSuccess: () => {
      toast.success("Demo generated successfully!");
      refetchDemos();
      setTopic("");
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const generateDominicanMutation = trpc.kingcamDemos.generateDominican.useMutation({
    onSuccess: () => {
      toast.success("Dominican demo generated!");
      refetchDemos();
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const generateAdultMutation = trpc.kingcamDemos.generateAdult.useMutation({
    onSuccess: () => {
      toast.success("Adult demo generated!");
      refetchDemos();
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const deleteMutation = trpc.kingcamDemos.delete.useMutation({
    onSuccess: () => {
      toast.success("Demo deleted");
      refetchDemos();
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    generateMutation.mutate({
      topic,
      sector,
    });
  };

  const handleGenerateDominican = () => {
    generateDominicanMutation.mutate({
      topic: "Cómo ganar dinero con CreatorVault",
    });
  };

  const handleGenerateAdult = () => {
    generateAdultMutation.mutate({
      topic: "How creators actually keep 85% with CreatorVault",
    });
  };

  const isGenerating = generateMutation.isPending || generateDominicanMutation.isPending || generateAdultMutation.isPending;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🦁 KingCam Demos</h1>
        <p className="text-muted-foreground">
          Autonomous content generation. KingCam creates content. You do NOT.
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="library">Demo Library</TabsTrigger>
          <TabsTrigger value="quick">Quick Actions</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Custom Demo</CardTitle>
              <CardDescription>
                Topic → RealGPT Script → KingCam Voice → Video Generation → S3 Storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., How to monetize your content on CreatorVault"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector">Sector</Label>
                <Select
                  value={sector}
                  onValueChange={(value) => setSector(value as "dominican" | "adult" | "general")}
                  disabled={isGenerating}
                >
                  <SelectTrigger id="sector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="dominican">Dominican 🇩🇴</SelectItem>
                    <SelectItem value="adult">Adult 🔞</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate Demo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🇩🇴 Dominican Sector</CardTitle>
                <CardDescription>
                  "Cómo ganar dinero con CreatorVault"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateDominican}
                  disabled={isGenerating}
                  className="w-full"
                  variant="default"
                >
                  {generateDominicanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Generate Dominican Demo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔞 Adult Sector</CardTitle>
                <CardDescription>
                  "How creators actually keep 85% with CreatorVault"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateAdult}
                  disabled={isGenerating}
                  className="w-full"
                  variant="default"
                >
                  {generateAdultMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Generate Adult Demo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <Select
              value={filterSector}
              onValueChange={(value) => setFilterSector(value as "dominican" | "adult" | "general" | "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="dominican">Dominican 🇩🇴</SelectItem>
                <SelectItem value="adult">Adult 🔞</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!demosData?.demos || demosData.demos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No demos yet. Generate your first demo!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demosData.demos.map((demo) => (
                <Card key={demo.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{demo.title}</CardTitle>
                        <CardDescription>
                          {demo.sector === "dominican" && "🇩🇴 Dominican"}
                          {demo.sector === "adult" && "🔞 Adult"}
                          {demo.sector === "general" && "General"}
                          {" • "}
                          {demo.duration}s
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate({ id: demo.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {demo.videoUrl ? (
                      <div className="space-y-2">
                        <video
                          src={demo.videoUrl}
                          controls
                          className="w-full rounded-lg"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => demo.videoUrl && window.open(demo.videoUrl, "_blank")}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Open in New Tab
                        </Button>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        Video processing...
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
