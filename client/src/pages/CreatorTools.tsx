import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, MessageSquare, Send, TrendingUp, Lightbulb } from "lucide-react";

export default function CreatorTools() {
  const [viralHooksInput, setViralHooksInput] = useState("");
  const [captionTopic, setCaptionTopic] = useState("");
  const [captionTone, setCaptionTone] = useState("");
  const [telegramMessage, setTelegramMessage] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [strategyNiche, setStrategyNiche] = useState("");
  const [strategyGoals, setStrategyGoals] = useState("");
  const [viralContent, setViralContent] = useState("");
  const [optimizerTitle, setOptimizerTitle] = useState("");
  const [optimizerDescription, setOptimizerDescription] = useState("");
  const [optimizerTags, setOptimizerTags] = useState("");
  const [optimizerPlatform, setOptimizerPlatform] = useState<"youtube" | "tiktok" | "instagram" | "twitter">("tiktok");

  const generateViralHooks = trpc.creatorTools.generateViralHooks.useMutation();
  const generateCaption = trpc.creatorTools.generateCaption.useMutation();
  const generateTelegramBroadcast = trpc.creatorTools.generateTelegramBroadcast.useMutation();
  const generateWhatsappCampaign = trpc.creatorTools.generateWhatsAppCampaign.useMutation();
  const generateStrategy = trpc.creatorTools.generateContentStrategy.useMutation();
  const analyzeViral = trpc.creatorTools.analyzeViralPotential.useMutation();
  const runOptimizer = trpc.creatorTools.runViralOptimizer.useMutation();

  const handleViralHooks = async () => {
    if (!viralHooksInput.trim()) return;
    await generateViralHooks.mutateAsync({ niche: viralHooksInput, platform: "tiktok" });
  };

  const handleCaption = async () => {
    if (!captionTopic.trim()) return;
    await generateCaption.mutateAsync({ 
      content: captionTopic, 
      platform: "instagram", 
      includeHashtags: true,
      includeCTA: true
    });
  };

  const handleTelegram = async () => {
    if (!telegramMessage.trim()) return;
    await generateTelegramBroadcast.mutateAsync({ audience: "all", message: telegramMessage });
  };

  const handleWhatsapp = async () => {
    if (!whatsappMessage.trim()) return;
    await generateWhatsappCampaign.mutateAsync({ audience: "all", message: whatsappMessage });
  };

  const handleStrategy = async () => {
    if (!strategyNiche.trim()) return;
    await generateStrategy.mutateAsync({ niche: strategyNiche, goals: strategyGoals || "grow audience" });
  };

  const handleViralAnalysis = async () => {
    if (!viralContent.trim()) return;
    await analyzeViral.mutateAsync({ content: viralContent, platform: "tiktok" });
  };

  const handleRunOptimizer = async () => {
    if (!optimizerTitle.trim()) return;
    await runOptimizer.mutateAsync({
      title: optimizerTitle,
      description: optimizerDescription || undefined,
      tags: optimizerTags ? optimizerTags.split(",").map(t => t.trim()) : undefined,
      platform: optimizerPlatform,
    });
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Creator Tools
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered tools to generate viral content, captions, and campaigns
            </p>
          </div>
          <Button asChild variant="outline" size="lg">
            <a href="/creator-video-studio">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Video Studio
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9">
          <TabsTrigger value="hooks">Viral Hooks</TabsTrigger>
          <TabsTrigger value="caption">Captions</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="optimizer">Viral Optimizer</TabsTrigger>
          <TabsTrigger value="ads">Facebook Ads</TabsTrigger>
          <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
        </TabsList>

        {/* Viral Hooks Generator */}
        <TabsContent value="hooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Viral Hook Generator
              </CardTitle>
              <CardDescription>
                Generate attention-grabbing hooks for your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="viral-topic">Topic or Theme</Label>
                <Input
                  id="viral-topic"
                  placeholder="e.g., morning routine, productivity hacks, fitness tips"
                  value={viralHooksInput}
                  onChange={(e) => setViralHooksInput(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleViralHooks} 
                disabled={generateViralHooks.isPending || !viralHooksInput.trim()}
                className="w-full"
              >
                {generateViralHooks.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Hooks
              </Button>
              {generateViralHooks.data && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Generated Hooks:</h3>
                  <ul className="space-y-2">
                    {generateViralHooks.data.hooks.map((hook, idx) => (
                      <li key={idx} className="text-sm border-l-2 border-purple-500 pl-3">
                        {hook}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {generateViralHooks.error && (
                <p className="text-sm text-destructive">Error: {generateViralHooks.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Caption Generator */}
        <TabsContent value="caption">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-pink-500" />
                Caption + CTA Generator
              </CardTitle>
              <CardDescription>
                Create engaging captions with strong calls-to-action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="caption-topic">Topic</Label>
                <Input
                  id="caption-topic"
                  placeholder="e.g., new product launch, behind the scenes"
                  value={captionTopic}
                  onChange={(e) => setCaptionTopic(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="caption-tone">Tone (optional)</Label>
                <Input
                  id="caption-tone"
                  placeholder="e.g., casual, professional, funny"
                  value={captionTone}
                  onChange={(e) => setCaptionTone(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCaption} 
                disabled={generateCaption.isPending || !captionTopic.trim()}
                className="w-full"
              >
                {generateCaption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Caption
              </Button>
              {generateCaption.data && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Generated Caption:</h3>
                  <p className="text-sm whitespace-pre-wrap">{generateCaption.data.caption}</p>
                </div>
              )}
              {generateCaption.error && (
                <p className="text-sm text-destructive">Error: {generateCaption.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telegram Broadcast */}
        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Telegram Broadcast Composer
              </CardTitle>
              <CardDescription>
                Create formatted broadcasts for Telegram channels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="telegram-message">Message</Label>
                <Textarea
                  id="telegram-message"
                  placeholder="Enter your broadcast message..."
                  value={telegramMessage}
                  onChange={(e) => setTelegramMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                onClick={handleTelegram} 
                disabled={generateTelegramBroadcast.isPending || !telegramMessage.trim()}
                className="w-full"
              >
                {generateTelegramBroadcast.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Broadcast
              </Button>
              {generateTelegramBroadcast.data && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Formatted Broadcast:</h3>
                  <p className="text-sm whitespace-pre-wrap font-mono">{generateTelegramBroadcast.data.broadcast}</p>
                </div>
              )}
              {generateTelegramBroadcast.error && (
                <p className="text-sm text-destructive">Error: {generateTelegramBroadcast.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Campaign */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-green-500" />
                WhatsApp Campaign Composer
              </CardTitle>
              <CardDescription>
                Create personalized WhatsApp campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="whatsapp-message">Message</Label>
                <Textarea
                  id="whatsapp-message"
                  placeholder="Enter your campaign message..."
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                onClick={handleWhatsapp} 
                disabled={generateWhatsappCampaign.isPending || !whatsappMessage.trim()}
                className="w-full"
              >
                {generateWhatsappCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Campaign
              </Button>
              {generateWhatsappCampaign.data && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Formatted Campaign:</h3>
                  <p className="text-sm whitespace-pre-wrap">{generateWhatsappCampaign.data.campaign}</p>
                </div>
              )}
              {generateWhatsappCampaign.error && (
                <p className="text-sm text-destructive">Error: {generateWhatsappCampaign.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Strategy */}
        <TabsContent value="strategy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Content Strategy Generator
              </CardTitle>
              <CardDescription>
                Get a personalized content strategy for your niche
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="strategy-niche">Niche</Label>
                <Input
                  id="strategy-niche"
                  placeholder="e.g., fitness, cooking, tech reviews"
                  value={strategyNiche}
                  onChange={(e) => setStrategyNiche(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="strategy-goals">Goals (optional)</Label>
                <Input
                  id="strategy-goals"
                  placeholder="e.g., grow audience, increase engagement, monetize"
                  value={strategyGoals}
                  onChange={(e) => setStrategyGoals(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleStrategy} 
                disabled={generateStrategy.isPending || !strategyNiche.trim()}
                className="w-full"
              >
                {generateStrategy.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Strategy
              </Button>
              {generateStrategy.data && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Your Content Strategy:</h3>
                  <p className="text-sm whitespace-pre-wrap">{generateStrategy.data.strategy}</p>
                </div>
              )}
              {generateStrategy.error && (
                <p className="text-sm text-destructive">Error: {generateStrategy.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Viral Analyzer */}
        <TabsContent value="analyze">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                Viral Potential Analyzer
              </CardTitle>
              <CardDescription>
                Analyze content for viral potential and get optimization tips
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="viral-content">Content to Analyze</Label>
                <Textarea
                  id="viral-content"
                  placeholder="Paste your content here (caption, script, hook, etc.)"
                  value={viralContent}
                  onChange={(e) => setViralContent(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                onClick={handleViralAnalysis} 
                disabled={analyzeViral.isPending || !viralContent.trim()}
                className="w-full"
              >
                {analyzeViral.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Viral Potential
              </Button>
              {analyzeViral.data && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Viral Score:</h3>
                    <span className="text-2xl font-bold text-purple-500">
                      {analyzeViral.data.score}/100
                    </span>
                  </div>
                  {analyzeViral.data.strengths && analyzeViral.data.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold mb-1">Strengths:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {analyzeViral.data.strengths.map((strength: string, idx: number) => (
                          <li key={idx} className="text-sm text-green-600">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analyzeViral.data.improvements && analyzeViral.data.improvements.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold mb-1">Areas for Improvement:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {analyzeViral.data.improvements.map((improvement: string, idx: number) => (
                          <li key={idx} className="text-sm text-orange-600">{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analyzeViral.data.suggestions && analyzeViral.data.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-semibold mb-2">Optimization Tips:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {analyzeViral.data.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="text-sm">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {analyzeViral.error && (
                <p className="text-sm text-destructive">Error: {analyzeViral.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Viral Optimizer (CANONICAL PIPELINE) */}
        <TabsContent value="optimizer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Viral Optimizer
              </CardTitle>
              <CardDescription>
                Complete viral optimization: hooks, analysis, scoring, and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="optimizer-title">Content Title *</Label>
                <Input
                  id="optimizer-title"
                  placeholder="e.g., How I Made $10k in 30 Days"
                  value={optimizerTitle}
                  onChange={(e) => setOptimizerTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="optimizer-description">Description (optional)</Label>
                <Textarea
                  id="optimizer-description"
                  placeholder="Brief description of your content"
                  value={optimizerDescription}
                  onChange={(e) => setOptimizerDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="optimizer-tags">Tags (optional, comma-separated)</Label>
                <Input
                  id="optimizer-tags"
                  placeholder="e.g., money, business, tutorial"
                  value={optimizerTags}
                  onChange={(e) => setOptimizerTags(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="optimizer-platform">Platform</Label>
                <select
                  id="optimizer-platform"
                  value={optimizerPlatform}
                  onChange={(e) => setOptimizerPlatform(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                </select>
              </div>
              <Button 
                onClick={handleRunOptimizer} 
                disabled={runOptimizer.isPending || !optimizerTitle.trim()}
                className="w-full"
              >
                {runOptimizer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Viral Optimizer
              </Button>
              {runOptimizer.data && (
                <div className="mt-6 space-y-6">
                  {/* Viral Score */}
                  <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">Viral Score</h3>
                      <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        {runOptimizer.data.viralScore}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hook:</span>
                        <span className="font-semibold">{runOptimizer.data.hookScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quality:</span>
                        <span className="font-semibold">{runOptimizer.data.qualityScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trend:</span>
                        <span className="font-semibold">{runOptimizer.data.trendScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Audience:</span>
                        <span className="font-semibold">{runOptimizer.data.audienceScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span className="font-semibold">{runOptimizer.data.formatScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timing:</span>
                        <span className="font-semibold">{runOptimizer.data.timingScore}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Viral Hooks */}
                  {runOptimizer.data.hooks && runOptimizer.data.hooks.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-3">Viral Hooks:</h3>
                      <ul className="space-y-2">
                        {runOptimizer.data.hooks.map((hook: string, idx: number) => (
                          <li key={idx} className="p-3 bg-background rounded border">
                            <p className="text-sm">{hook}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {runOptimizer.data.weaknesses && runOptimizer.data.weaknesses.length > 0 && (
                    <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <h3 className="font-semibold mb-2 text-orange-600">Weaknesses:</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {runOptimizer.data.weaknesses.map((weakness: string, idx: number) => (
                          <li key={idx} className="text-sm text-orange-600">{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {runOptimizer.data.recommendations && runOptimizer.data.recommendations.length > 0 && (
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <h3 className="font-semibold mb-2 text-green-600">Recommendations:</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {runOptimizer.data.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-sm text-green-600">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Optimized Content */}
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <h3 className="font-semibold mb-3">Optimized Content:</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Title:</p>
                        <p className="text-sm font-medium">{runOptimizer.data.optimizedTitle}</p>
                      </div>
                      {runOptimizer.data.optimizedDescription && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Description:</p>
                          <p className="text-sm">{runOptimizer.data.optimizedDescription}</p>
                        </div>
                      )}
                      {runOptimizer.data.optimizedTags && runOptimizer.data.optimizedTags.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Tags:</p>
                          <div className="flex flex-wrap gap-2">
                            {runOptimizer.data.optimizedTags.map((tag: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-purple-500/20 rounded text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Predicted Metrics */}
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <h3 className="font-semibold mb-3">Predicted Performance:</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Views</p>
                        <p className="text-lg font-bold">{runOptimizer.data.predictedMetrics.views.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="text-lg font-bold">{runOptimizer.data.predictedMetrics.engagement}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="text-lg font-bold">{runOptimizer.data.predictedMetrics.ctr}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Retention</p>
                        <p className="text-lg font-bold">{runOptimizer.data.predictedMetrics.retention}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {runOptimizer.error && (
                <p className="text-sm text-destructive">Error: {runOptimizer.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facebook Ads Generator */}
        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <CardTitle>Facebook Ad Maker + Optimizer</CardTitle>
              <CardDescription>
                Generate high-converting Facebook ad copy + creative with AI scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ad inputs will be added here */}
              <p className="text-sm text-muted-foreground">Facebook Ads tab - Coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YouTube Thumbnails Generator */}
        <TabsContent value="thumbnails">
          <Card>
            <CardHeader>
              <CardTitle>YouTube Thumbnail Generator</CardTitle>
              <CardDescription>
                Generate high-CTR YouTube thumbnails with AI optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Thumbnail inputs will be added here */}
              <p className="text-sm text-muted-foreground">YouTube Thumbnails tab - Coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
