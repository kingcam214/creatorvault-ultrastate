/**
 * Creator AI Video Studio
 * 
 * Long-form multi-scene video generation with:
 * - Scene timeline composer
 * - Character continuity controls
 * - Scene regeneration
 * - Video assembly
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Film, 
  Sparkles, 
  Image as ImageIcon, 
  Play, 
  RefreshCw, 
  Lock, 
  Unlock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download
} from "lucide-react";

interface Scene {
  id: string;
  sceneIndex: number;
  description: string;
  prompt: string;
  imageUrl?: string;
  status: "pending" | "generating" | "complete" | "failed";
  errorMessage?: string;
  regenerationCount?: number;
  characterLocked?: boolean;
}

interface VideoJob {
  id: number;
  prompt: string;
  duration: number;
  sceneCount: number;
  status: "pending" | "queued" | "processing" | "complete" | "failed";
  progress: number;
  scenes: Scene[];
  characterFeatures?: {
    hair: string;
    eyes: string;
    skin: string;
    clothing: string;
    style: string;
  };
}

export default function CreatorVideoStudio() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("create");
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  
  // Create job form state
  const [prompt, setPrompt] = useState("");
  const [baseImageUrl, setBaseImageUrl] = useState("");
  const [duration, setDuration] = useState(30);
  const [sceneCount, setSceneCount] = useState(5);

  // Mutations
  const createJob = trpc.video.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Video job created",
        description: "Scene plan generated. Click 'Generate Scenes' to start.",
      });
      setCurrentJobId(data.jobId);
      setActiveTab("timeline");
    },
    onError: (error) => {
      toast({
        title: "Failed to create video job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateScenes = trpc.video.generateScenes.useMutation({
    onSuccess: () => {
      toast({
        title: "Scene generation started",
        description: "Generating all scenes with character continuity...",
      });
      jobQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to generate scenes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateScene = trpc.video.regenerateScene.useMutation({
    onSuccess: () => {
      toast({
        title: "Scene regenerated",
        description: "New version created with updated prompt.",
      });
      jobQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to regenerate scene",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderScenes = trpc.video.reorderScenes.useMutation({
    onSuccess: () => {
      toast({
        title: "Scenes reordered",
        description: "Timeline updated successfully.",
      });
      jobQuery.refetch();
    },
  });

  // Queries
  const jobsQuery = trpc.video.getMyJobs.useQuery();
  const jobQuery = trpc.video.getJob.useQuery(
    { jobId: currentJobId! },
    { enabled: !!currentJobId, refetchInterval: (currentJobId && jobsQuery.data?.find((j: any) => j.id === currentJobId)?.status === "processing") ? 3000 : false }
  );

  const currentJob = jobQuery.data as VideoJob | null | undefined;

  const handleCreateJob = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a video concept.",
        variant: "destructive",
      });
      return;
    }

    createJob.mutate({
      prompt,
      baseImageUrl: baseImageUrl || undefined,
      duration,
      sceneCount,
    });
  };

  const handleGenerateScenes = () => {
    if (!currentJobId) return;
    generateScenes.mutate({ jobId: currentJobId });
  };

  const handleRegenerateScene = (sceneId: string, currentPrompt: string) => {
    const newPrompt = window.prompt("Enter new scene prompt:", currentPrompt);
    if (!newPrompt) return;
    
    regenerateScene.mutate({
      sceneId,
      newPrompt,
    });
  };

  const handleMoveScene = (sceneIndex: number, direction: "up" | "down") => {
    if (!currentJob) return;
    
    const scenes = [...currentJob.scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);
    const newIndex = direction === "up" ? sceneIndex - 1 : sceneIndex + 1;
    
    if (newIndex < 0 || newIndex >= scenes.length) return;
    
    // Swap scenes
    [scenes[sceneIndex], scenes[newIndex]] = [scenes[newIndex], scenes[sceneIndex]];
    
    reorderScenes.mutate({
      jobId: currentJob.id,
      sceneIds: scenes.map(s => s.id),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Creator AI Video Studio
            </h1>
          </div>
          <p className="text-muted-foreground">
            Generate long-form AI videos with scene continuity and character consistency
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="create">
              <Sparkles className="w-4 h-4 mr-2" />
              Create Video
            </TabsTrigger>
            <TabsTrigger value="timeline" disabled={!currentJobId}>
              <Film className="w-4 h-4 mr-2" />
              Scene Timeline
            </TabsTrigger>
            <TabsTrigger value="library">
              <ImageIcon className="w-4 h-4 mr-2" />
              My Videos
            </TabsTrigger>
          </TabsList>

          {/* Create Video Tab */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>New Video Project</CardTitle>
                <CardDescription>
                  Describe your video concept and we'll generate a multi-scene timeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Video Concept *</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Example: A day in the life of a cyberpunk hacker navigating neon-lit streets, infiltrating corporate servers, and escaping through underground tunnels..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseImage">Base Image URL (Optional)</Label>
                  <Input
                    id="baseImage"
                    placeholder="https://example.com/character-reference.jpg"
                    value={baseImageUrl}
                    onChange={(e) => setBaseImageUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Provide a character reference image to maintain visual consistency
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={15}
                      max={300}
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sceneCount">Scene Count</Label>
                    <Input
                      id="sceneCount"
                      type="number"
                      min={3}
                      max={15}
                      value={sceneCount}
                      onChange={(e) => setSceneCount(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCreateJob}
                  disabled={createJob.isPending || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {createJob.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating Scene Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Video Project
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scene Timeline Tab */}
          <TabsContent value="timeline">
            {currentJob ? (
              <div className="space-y-6">
                {/* Job Status Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{currentJob.prompt.slice(0, 60)}...</CardTitle>
                        <CardDescription>
                          {currentJob.sceneCount} scenes • {currentJob.duration}s duration
                        </CardDescription>
                      </div>
                      <Badge variant={
                        currentJob.status === "complete" ? "default" :
                        currentJob.status === "processing" ? "secondary" :
                        currentJob.status === "failed" ? "destructive" :
                        "outline"
                      }>
                        {currentJob.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentJob.status === "processing" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Generating scenes...</span>
                          <span>{currentJob.progress}%</span>
                        </div>
                        <Progress value={currentJob.progress} />
                      </div>
                    )}

                    {currentJob.status === "queued" && (
                      <Button
                        onClick={handleGenerateScenes}
                        disabled={generateScenes.isPending}
                        className="w-full"
                      >
                        {generateScenes.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Generate All Scenes
                          </>
                        )}
                      </Button>
                    )}

                    {currentJob.characterFeatures && (
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Lock className="w-4 h-4" />
                          Character Features Locked
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Hair: {currentJob.characterFeatures.hair}</div>
                          <div>Eyes: {currentJob.characterFeatures.eyes}</div>
                          <div>Skin: {currentJob.characterFeatures.skin}</div>
                          <div>Style: {currentJob.characterFeatures.style}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scene Timeline */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Scene Timeline</h3>
                  {currentJob.scenes
                    .sort((a, b) => a.sceneIndex - b.sceneIndex)
                    .map((scene, index) => (
                      <Card key={scene.id}>
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Scene Preview */}
                            <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              {scene.imageUrl ? (
                                <img
                                  src={scene.imageUrl}
                                  alt={`Scene ${scene.sceneIndex + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : scene.status === "generating" ? (
                                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              )}
                            </div>

                            {/* Scene Details */}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">Scene {scene.sceneIndex + 1}</h4>
                                <Badge variant={
                                  scene.status === "complete" ? "default" :
                                  scene.status === "generating" ? "secondary" :
                                  scene.status === "failed" ? "destructive" :
                                  "outline"
                                }>
                                  {scene.status}
                                </Badge>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {scene.description}
                              </p>

                              {scene.errorMessage && (
                                <p className="text-sm text-destructive">
                                  Error: {scene.errorMessage}
                                </p>
                              )}

                              {scene.regenerationCount && scene.regenerationCount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Regenerated {scene.regenerationCount} time(s)
                                </p>
                              )}

                              {/* Scene Actions */}
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRegenerateScene(scene.id, scene.prompt)}
                                  disabled={scene.status === "generating" || regenerateScene.isPending}
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Regenerate
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveScene(index, "up")}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveScene(index, "down")}
                                  disabled={index === currentJob.scenes.length - 1}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No video project selected. Create a new project to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library">
            <div className="space-y-4">
              {jobsQuery.data && jobsQuery.data.length > 0 ? (
                jobsQuery.data.map((job: any) => (
                  <Card
                    key={job.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setCurrentJobId(job.id);
                      setActiveTab("timeline");
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{job.prompt.slice(0, 60)}...</h4>
                          <p className="text-sm text-muted-foreground">
                            {job.sceneCount} scenes • {job.duration}s • Created {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={
                          job.status === "complete" ? "default" :
                          job.status === "processing" ? "secondary" :
                          job.status === "failed" ? "destructive" :
                          "outline"
                        }>
                          {job.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No video projects yet. Create your first AI video!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
