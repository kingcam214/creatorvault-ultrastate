/**
 * Unified Content Publisher
 * 
 * SINGLE INTERFACE for all content creation, optimization, and distribution.
 * 
 * Replaces fragmented workflow:
 * ❌ OLD: Create content → Run viral optimizer → Generate thumbnail → Generate ad → 
 *         Adapt for platforms → Post/schedule → Track analytics (10+ steps)
 * 
 * ✅ NEW: Fill form → Click publish → Done (1 step, everything automatic)
 * 
 * The orchestrator handles:
 * - Viral optimization
 * - Thumbnail generation
 * - Ad generation (optional)
 * - Platform-specific adaptation
 * - Distribution (immediate/scheduled/draft)
 * - Performance tracking
 * - Feedback loop to improve future content
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Rocket, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Target,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UnifiedContentPublisher() {
  const { toast } = useToast();
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | "text">("video");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [category, setCategory] = useState("");
  const [niche, setNiche] = useState("");
  
  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube"]);
  
  // Distribution strategy
  const [publishStrategy, setPublishStrategy] = useState<"immediate" | "scheduled" | "draft">("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Optimization preferences
  const [optimizationLevel, setOptimizationLevel] = useState<"none" | "basic" | "aggressive">("aggressive");
  const [generateThumbnail, setGenerateThumbnail] = useState(true);
  const [generateAd, setGenerateAd] = useState(false);
  const [runViralAnalysis, setRunViralAnalysis] = useState(true);
  
  // Orchestration state
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestrationProgress, setOrchestrationProgress] = useState(0);
  const [orchestrationStage, setOrchestrationStage] = useState("");
  const [orchestrationResult, setOrchestrationResult] = useState<any>(null);
  
  // Mutations
  const orchestrateMutation = trpc.orchestrator.orchestrate.useMutation({
    onSuccess: (result) => {
      setOrchestrationResult(result);
      setIsOrchestrating(false);
      setOrchestrationProgress(100);
      
      toast({
        title: "✨ Content Orchestrated Successfully!",
        description: `Your content has been ${
          result.status === "published" ? "published" :
          result.status === "scheduled" ? "scheduled" :
          "saved as draft"
        }`,
      });
    },
    onError: (error) => {
      setIsOrchestrating(false);
      toast({
        title: "Orchestration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Platform options
  const platforms = [
    { id: "youtube", name: "YouTube", icon: "🎥" },
    { id: "tiktok", name: "TikTok", icon: "🎵" },
    { id: "instagram", name: "Instagram", icon: "📸" },
    { id: "twitter", name: "Twitter/X", icon: "🐦" },
    { id: "facebook", name: "Facebook", icon: "👥" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "pinterest", name: "Pinterest", icon: "📌" },
  ];
  
  // Handle tag addition
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  
  // Handle tag removal
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Handle platform toggle
  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };
  
  // Handle orchestration
  const handleOrchestrate = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your content",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedPlatforms.length === 0) {
      toast({
        title: "Platform Required",
        description: "Please select at least one platform",
        variant: "destructive",
      });
      return;
    }
    
    if (publishStrategy === "scheduled" && (!scheduledDate || !scheduledTime)) {
      toast({
        title: "Schedule Required",
        description: "Please select date and time for scheduled publishing",
        variant: "destructive",
      });
      return;
    }
    
    // Start orchestration
    setIsOrchestrating(true);
    setOrchestrationProgress(0);
    setOrchestrationStage("Initializing...");
    
    // Simulate progress (real progress would come from backend)
    const progressInterval = setInterval(() => {
      setOrchestrationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);
    
    // Update stages
    setTimeout(() => setOrchestrationStage("Running viral analysis..."), 500);
    setTimeout(() => setOrchestrationStage("Generating thumbnail..."), 1500);
    setTimeout(() => setOrchestrationStage("Optimizing for platforms..."), 2500);
    setTimeout(() => setOrchestrationStage("Preparing distribution..."), 3500);
    
    // Prepare scheduled date
    let scheduledFor: Date | undefined;
    if (publishStrategy === "scheduled" && scheduledDate && scheduledTime) {
      scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    }
    
    // Call orchestrator
    orchestrateMutation.mutate({
      title,
      description: description || undefined,
      body: body || undefined,
      mediaUrl: mediaUrl || undefined,
      mediaType,
      tags: tags.length > 0 ? tags : undefined,
      category: category || undefined,
      niche: niche || undefined,
      targetPlatforms: selectedPlatforms as any,
      publishStrategy,
      scheduledFor,
      optimizationLevel,
      generateThumbnail,
      generateAd,
      runViralAnalysis,
    });
  };
  
  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setBody("");
    setMediaUrl("");
    setTags([]);
    setCategory("");
    setNiche("");
    setOrchestrationResult(null);
    setOrchestrationProgress(0);
    setOrchestrationStage("");
  };
  
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="w-10 h-10 text-purple-500" />
          Unified Content Publisher
        </h1>
        <p className="text-muted-foreground text-lg">
          One interface. Automatic optimization. Multi-platform distribution. Zero manual steps.
        </p>
      </div>
      
      {orchestrationResult ? (
        // Success View
        <Card className="border-green-500 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              Content Orchestrated Successfully!
            </CardTitle>
            <CardDescription>
              Your content has been optimized and {
                orchestrationResult.status === "published" ? "published to all platforms" :
                orchestrationResult.status === "scheduled" ? "scheduled for publishing" :
                "saved as draft"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Optimization Results */}
            {orchestrationResult.viralAnalysis && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Viral Analysis
                </h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Viral Score</span>
                    <Badge variant={
                      orchestrationResult.viralAnalysis.viralScore >= 80 ? "default" :
                      orchestrationResult.viralAnalysis.viralScore >= 60 ? "secondary" :
                      "outline"
                    }>
                      {orchestrationResult.viralAnalysis.viralScore}/100
                    </Badge>
                  </div>
                  <Progress value={orchestrationResult.viralAnalysis.viralScore} className="h-2" />
                  {orchestrationResult.viralAnalysis.recommendations && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Top Recommendations:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {orchestrationResult.viralAnalysis.recommendations.slice(0, 3).map((rec: string, i: number) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Generated Assets */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" />
                Generated Assets
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {orchestrationResult.generatedAssets.thumbnails.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Thumbnails</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {orchestrationResult.generatedAssets.thumbnails.length} generated
                      </p>
                    </CardContent>
                  </Card>
                )}
                {orchestrationResult.generatedAssets.ads.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Ad Creatives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {orchestrationResult.generatedAssets.ads.length} generated
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            
            {/* Platform Adaptations */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Platform Adaptations
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(orchestrationResult.platformAdaptations).map((platform) => (
                  <Badge key={platform} variant="secondary">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Distribution Results */}
            {orchestrationResult.distributionResults && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Distribution
                </h3>
                {orchestrationResult.distributionResults.immediate && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Published to:</p>
                    <div className="space-y-1">
                      {Object.entries(orchestrationResult.distributionResults.immediate.urls).map(([platform, url]: [string, any]) => (
                        <div key={platform} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{platform}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            View Post →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {orchestrationResult.distributionResults.scheduled && (
                  <Alert>
                    <Clock className="w-4 h-4" />
                    <AlertDescription>
                      Scheduled for {new Date(orchestrationResult.distributionResults.scheduled.scheduledFor).toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={resetForm} variant="outline">
                Create Another
              </Button>
              <Button onClick={() => window.location.href = "/creator-analytics"}>
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Form View
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>
          
          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Details</CardTitle>
                <CardDescription>
                  Basic information about your content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter a compelling title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your content..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="body">Body (Optional)</Label>
                  <Textarea
                    id="body"
                    placeholder="Full content text (for articles, scripts, etc.)..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mediaType">Media Type</Label>
                    <Select value={mediaType} onValueChange={(v: any) => setMediaType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Video
                          </div>
                        </SelectItem>
                        <SelectItem value="image">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Image
                          </div>
                        </SelectItem>
                        <SelectItem value="audio">
                          <div className="flex items-center gap-2">
                            <Music className="w-4 h-4" />
                            Audio
                          </div>
                        </SelectItem>
                        <SelectItem value="text">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Text
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mediaUrl">Media URL (Optional)</Label>
                    <Input
                      id="mediaUrl"
                      placeholder="https://..."
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Education, Entertainment..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="niche">Niche</Label>
                    <Input
                      id="niche"
                      placeholder="e.g., Tech Reviews, Cooking..."
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Platforms</CardTitle>
                <CardDescription>
                  Select which platforms to publish to. Content will be automatically adapted for each platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {platforms.map((platform) => (
                    <Card
                      key={platform.id}
                      className={`cursor-pointer transition-all ${
                        selectedPlatforms.includes(platform.id)
                          ? "border-primary border-2 bg-primary/5"
                          : "hover:border-muted-foreground"
                      }`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={() => togglePlatform(platform.id)}
                        />
                        <span className="text-2xl">{platform.icon}</span>
                        <span className="font-medium">{platform.name}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {selectedPlatforms.length === 0 && (
                  <Alert className="mt-4">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Please select at least one platform
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Settings</CardTitle>
                <CardDescription>
                  Configure how your content will be optimized
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Optimization Level</Label>
                  <Select value={optimizationLevel} onValueChange={(v: any) => setOptimizationLevel(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - No optimization</SelectItem>
                      <SelectItem value="basic">Basic - Title & description only</SelectItem>
                      <SelectItem value="aggressive">Aggressive - Full optimization (recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="viralAnalysis"
                      checked={runViralAnalysis}
                      onCheckedChange={(checked) => setRunViralAnalysis(checked as boolean)}
                    />
                    <Label htmlFor="viralAnalysis" className="cursor-pointer">
                      Run Viral Analysis (Recommended)
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Analyzes your content and provides optimization suggestions to maximize viral potential
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateThumbnail"
                      checked={generateThumbnail}
                      onCheckedChange={(checked) => setGenerateThumbnail(checked as boolean)}
                    />
                    <Label htmlFor="generateThumbnail" className="cursor-pointer">
                      Generate Thumbnail
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Automatically generates an optimized thumbnail for your content
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateAd"
                      checked={generateAd}
                      onCheckedChange={(checked) => setGenerateAd(checked as boolean)}
                    />
                    <Label htmlFor="generateAd" className="cursor-pointer">
                      Generate Ad Creative
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Creates promotional ad creative for your content
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribution Strategy</CardTitle>
                <CardDescription>
                  Choose when and how to publish your content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Publishing Strategy</Label>
                  <Select value={publishStrategy} onValueChange={(v: any) => setPublishStrategy(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        <div className="flex items-center gap-2">
                          <Rocket className="w-4 h-4" />
                          Publish Immediately
                        </div>
                      </SelectItem>
                      <SelectItem value="scheduled">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Schedule for Later
                        </div>
                      </SelectItem>
                      <SelectItem value="draft">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Save as Draft
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {publishStrategy === "scheduled" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Date</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Time</Label>
                      <Input
                        id="scheduledTime"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                
                {publishStrategy === "immediate" && (
                  <Alert>
                    <Rocket className="w-4 h-4" />
                    <AlertDescription>
                      Your content will be published to all selected platforms immediately after optimization.
                    </AlertDescription>
                  </Alert>
                )}
                
                {publishStrategy === "draft" && (
                  <Alert>
                    <FileText className="w-4 h-4" />
                    <AlertDescription>
                      Your content will be optimized and saved as a draft. You can publish it later from your content library.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            {/* Orchestrate Button */}
            <Card className="border-primary">
              <CardContent className="pt-6">
                <Button
                  onClick={handleOrchestrate}
                  disabled={isOrchestrating || !title.trim() || selectedPlatforms.length === 0}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {isOrchestrating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Orchestrating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Orchestrate & {
                        publishStrategy === "immediate" ? "Publish" :
                        publishStrategy === "scheduled" ? "Schedule" :
                        "Save Draft"
                      }
                    </>
                  )}
                </Button>
                
                {isOrchestrating && (
                  <div className="mt-4 space-y-2">
                    <Progress value={orchestrationProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      {orchestrationStage}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
