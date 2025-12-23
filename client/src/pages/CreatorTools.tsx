import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, MessageSquare, Send, TrendingUp, Lightbulb, Share2, Calendar, BarChart3, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

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

  // Facebook Ads state
  const [adProduct, setAdProduct] = useState("");
  const [adAudience, setAdAudience] = useState("");
  const [adGoal, setAdGoal] = useState<"awareness" | "traffic" | "conversions" | "engagement">("conversions");
  const [adDescription, setAdDescription] = useState("");
  const [adTone, setAdTone] = useState<"casual" | "professional" | "urgent" | "playful">("professional");
  const [adBudget, setAdBudget] = useState("");

  // YouTube Thumbnails state
  const [thumbTitle, setThumbTitle] = useState("");
  const [thumbNiche, setThumbNiche] = useState("");
  const [thumbStyle, setThumbStyle] = useState<"bold" | "minimal" | "dramatic" | "playful">("bold");
  const [thumbCustomPrompt, setThumbCustomPrompt] = useState("");

  const generateViralHooks = trpc.creatorTools.generateViralHooks.useMutation();
  const generateCaption = trpc.creatorTools.generateCaption.useMutation();
  const generateTelegramBroadcast = trpc.creatorTools.generateTelegramBroadcast.useMutation();
  const generateWhatsappCampaign = trpc.creatorTools.generateWhatsAppCampaign.useMutation();
  const generateStrategy = trpc.creatorTools.generateContentStrategy.useMutation();
  const analyzeViral = trpc.creatorTools.analyzeViralPotential.useMutation();
  const runOptimizer = trpc.creatorTools.runViralOptimizer.useMutation();
  const runAdOptimizer = trpc.creatorTools.runAdOptimizer.useMutation();
  const runThumbnailGenerator = trpc.creatorTools.runThumbnailGenerator.useMutation();

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

  const handleRunAdOptimizer = async () => {
    if (!adProduct.trim() || !adAudience.trim()) return;
    await runAdOptimizer.mutateAsync({
      product: adProduct,
      targetAudience: adAudience,
      goal: adGoal,
      description: adDescription || undefined,
      tone: adTone,
      budget: adBudget ? parseInt(adBudget) : undefined,
    });
  };

  const handleRunThumbnailGenerator = async () => {
    if (!thumbTitle.trim() || !thumbNiche.trim()) return;
    await runThumbnailGenerator.mutateAsync({
      videoTitle: thumbTitle,
      niche: thumbNiche,
      style: thumbStyle,
      customPrompt: thumbCustomPrompt || undefined,
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

      {/* Multi-Platform Features */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Link href="/platform-connections">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Platform Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect your social media accounts
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/multi-platform-posting">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                Multi-Platform Posting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Post to all platforms at once
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/content-scheduler">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Content Scheduler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Schedule posts for optimal times
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/creator-analytics">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Creator Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track performance & revenue
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="hooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-15">
          <TabsTrigger value="hooks">Viral Hooks</TabsTrigger>
          <TabsTrigger value="caption">Captions</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="optimizer">Viral Optimizer</TabsTrigger>
          <TabsTrigger value="ads">Facebook Ads</TabsTrigger>
          <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
          <TabsTrigger value="ad-history">Ad History</TabsTrigger>
          <TabsTrigger value="thumb-history">Thumb History</TabsTrigger>
          <TabsTrigger value="batch-ads">Batch Ads</TabsTrigger>
          <TabsTrigger value="batch-thumbs">Batch Thumbs</TabsTrigger>
          <TabsTrigger value="ab-ads">A/B Ads</TabsTrigger>
          <TabsTrigger value="ab-thumbs">A/B Thumbs</TabsTrigger>
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
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Facebook Ad Maker + Optimizer
              </CardTitle>
              <CardDescription>
                Generate high-converting Facebook ad copy + creative with AI scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ad-product">Product/Service *</Label>
                <Input
                  id="ad-product"
                  placeholder="e.g., Online Course, Fitness App, Consulting Service"
                  value={adProduct}
                  onChange={(e) => setAdProduct(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ad-audience">Target Audience *</Label>
                <Input
                  id="ad-audience"
                  placeholder="e.g., Entrepreneurs 25-45, Fitness enthusiasts, Small business owners"
                  value={adAudience}
                  onChange={(e) => setAdAudience(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ad-goal">Campaign Goal</Label>
                <select
                  id="ad-goal"
                  value={adGoal}
                  onChange={(e) => setAdGoal(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="conversions">Conversions</option>
                  <option value="traffic">Traffic</option>
                  <option value="awareness">Awareness</option>
                  <option value="engagement">Engagement</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ad-description">Product Description (optional)</Label>
                <Textarea
                  id="ad-description"
                  placeholder="Brief description of your product/service"
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ad-tone">Tone</Label>
                  <select
                    id="ad-tone"
                    value={adTone}
                    onChange={(e) => setAdTone(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="urgent">Urgent</option>
                    <option value="playful">Playful</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="ad-budget">Budget (optional, USD)</Label>
                  <Input
                    id="ad-budget"
                    type="number"
                    placeholder="1000"
                    value={adBudget}
                    onChange={(e) => setAdBudget(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleRunAdOptimizer} 
                disabled={runAdOptimizer.isPending || !adProduct.trim() || !adAudience.trim()}
                className="w-full"
              >
                {runAdOptimizer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Facebook Ad
              </Button>
              {runAdOptimizer.data && (
                <div className="mt-6 space-y-6">
                  {/* Ad Preview */}
                  <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                    <h3 className="text-xl font-bold mb-4">Generated Ad</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Headline</p>
                        <p className="text-lg font-bold">{runAdOptimizer.data.headline}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Body Text</p>
                        <p className="text-sm">{runAdOptimizer.data.bodyText}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Call to Action</p>
                        <Button size="sm" className="pointer-events-none">{runAdOptimizer.data.cta}</Button>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Ad Creative</p>
                        <img src={runAdOptimizer.data.imageUrl} alt="Ad Creative" className="w-full rounded-lg border" />
                      </div>
                    </div>
                  </div>

                  {/* Ad Score */}
                  <div className="p-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">Ad Score</h3>
                      <span className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-600 bg-clip-text text-transparent">
                        {runAdOptimizer.data.overallScore}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hook:</span>
                        <span className="font-semibold">{runAdOptimizer.data.hookScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clarity:</span>
                        <span className="font-semibold">{runAdOptimizer.data.clarityScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Urgency:</span>
                        <span className="font-semibold">{runAdOptimizer.data.urgencyScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="font-semibold">{runAdOptimizer.data.valueScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CTA:</span>
                        <span className="font-semibold">{runAdOptimizer.data.ctaScore}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <h3 className="font-semibold mb-3 text-green-600">Strengths</h3>
                      <ul className="space-y-2 text-sm">
                        {runAdOptimizer.data.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <h3 className="font-semibold mb-3 text-orange-600">Weaknesses</h3>
                      <ul className="space-y-2 text-sm">
                        {runAdOptimizer.data.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">!</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <h3 className="font-semibold mb-3">Recommendations</h3>
                    <ul className="space-y-2 text-sm">
                      {runAdOptimizer.data.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Predicted Metrics */}
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <h3 className="font-semibold mb-3">Predicted Performance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="text-lg font-bold">{runAdOptimizer.data.predictedMetrics.ctr}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPC</p>
                        <p className="text-lg font-bold">${runAdOptimizer.data.predictedMetrics.cpc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Conversions</p>
                        <p className="text-lg font-bold">{runAdOptimizer.data.predictedMetrics.conversions}/1K</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ROAS</p>
                        <p className="text-lg font-bold">{runAdOptimizer.data.predictedMetrics.roas}x</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {runAdOptimizer.error && (
                <p className="text-sm text-destructive">Error: {runAdOptimizer.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* YouTube Thumbnails Generator */}
        <TabsContent value="thumbnails">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-red-500" />
                YouTube Thumbnail Generator
              </CardTitle>
              <CardDescription>
                Generate high-CTR YouTube thumbnails with AI optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="thumb-title">Video Title *</Label>
                <Input
                  id="thumb-title"
                  placeholder="e.g., How I Made $10k in 30 Days"
                  value={thumbTitle}
                  onChange={(e) => setThumbTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="thumb-niche">Niche *</Label>
                <Input
                  id="thumb-niche"
                  placeholder="e.g., finance, fitness, tech, lifestyle"
                  value={thumbNiche}
                  onChange={(e) => setThumbNiche(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="thumb-style">Thumbnail Style</Label>
                <select
                  id="thumb-style"
                  value={thumbStyle}
                  onChange={(e) => setThumbStyle(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="bold">Bold (High contrast, large text)</option>
                  <option value="minimal">Minimal (Clean, simple design)</option>
                  <option value="dramatic">Dramatic (Cinematic, moody)</option>
                  <option value="playful">Playful (Colorful, fun)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="thumb-custom">Custom Prompt (optional)</Label>
                <Textarea
                  id="thumb-custom"
                  placeholder="Add specific visual elements or style preferences"
                  value={thumbCustomPrompt}
                  onChange={(e) => setThumbCustomPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleRunThumbnailGenerator} 
                disabled={runThumbnailGenerator.isPending || !thumbTitle.trim() || !thumbNiche.trim()}
                className="w-full"
              >
                {runThumbnailGenerator.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Thumbnail
              </Button>
              {runThumbnailGenerator.data && (
                <div className="mt-6 space-y-6">
                  {/* Thumbnail Preview */}
                  <div className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/20">
                    <h3 className="text-xl font-bold mb-4">Generated Thumbnail</h3>
                    <div className="space-y-4">
                      <img src={runThumbnailGenerator.data.imageUrl} alt="Thumbnail" className="w-full rounded-lg border" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Text Overlay</p>
                        <p className="text-lg font-bold">{runThumbnailGenerator.data.textOverlay}</p>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Score */}
                  <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">Thumbnail Score</h3>
                      <span className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
                        {runThumbnailGenerator.data.overallScore}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CTR:</span>
                        <span className="font-semibold">{runThumbnailGenerator.data.ctrScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clarity:</span>
                        <span className="font-semibold">{runThumbnailGenerator.data.clarityScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Emotion:</span>
                        <span className="font-semibold">{runThumbnailGenerator.data.emotionScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contrast:</span>
                        <span className="font-semibold">{runThumbnailGenerator.data.contrastScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Text:</span>
                        <span className="font-semibold">{runThumbnailGenerator.data.textScore}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <h3 className="font-semibold mb-3 text-green-600">Strengths</h3>
                      <ul className="space-y-2 text-sm">
                        {runThumbnailGenerator.data.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <h3 className="font-semibold mb-3 text-orange-600">Weaknesses</h3>
                      <ul className="space-y-2 text-sm">
                        {runThumbnailGenerator.data.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">!</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <h3 className="font-semibold mb-3">Recommendations</h3>
                    <ul className="space-y-2 text-sm">
                      {runThumbnailGenerator.data.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Predicted Metrics */}
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <h3 className="font-semibold mb-3">Predicted Performance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">CTR by Niche</p>
                        <p className="text-lg font-bold">{runThumbnailGenerator.data.predictedMetrics.ctr}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Views Boost</p>
                        <p className="text-lg font-bold">+{runThumbnailGenerator.data.predictedMetrics.views}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {runThumbnailGenerator.error && (
                <p className="text-sm text-destructive">Error: {runThumbnailGenerator.error.message}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ad History Tab */}
        <TabsContent value="ad-history">
          <AdHistoryTab />
        </TabsContent>

        {/* Thumbnail History Tab */}
        <TabsContent value="thumb-history">
          <ThumbnailHistoryTab />
        </TabsContent>

        {/* Batch Ads Tab */}
        <TabsContent value="batch-ads">
          <BatchAdsTab />
        </TabsContent>

        {/* Batch Thumbnails Tab */}
        <TabsContent value="batch-thumbs">
          <BatchThumbnailsTab />
        </TabsContent>

        {/* A/B Testing Ads Tab */}
        <TabsContent value="ab-ads">
          <ABTestingAdsTab />
        </TabsContent>

        {/* A/B Testing Thumbnails Tab */}
        <TabsContent value="ab-thumbs">
          <ABTestingThumbnailsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Ad History Tab Component
function AdHistoryTab() {
  const [sortBy, setSortBy] = useState<"createdAt" | "overallScore" | "product">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const limit = 10;
  
  const { data, isLoading } = trpc.creatorTools.getAdHistory.useQuery({
    limit,
    offset: page * limit,
    sortBy,
    sortOrder,
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facebook Ad History</CardTitle>
        <CardDescription>View and manage your past ad generations</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading history...</p>}
        {data && data.analyses.length === 0 && (
          <p className="text-sm text-muted-foreground">No ad analyses yet. Generate your first ad!</p>
        )}
        {data && data.analyses.length > 0 && (
          <div className="space-y-4">
            {/* Sort Controls */}
            <div className="flex gap-4">
              <div>
                <Label>Sort By</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="createdAt">Date</option>
                  <option value="overallScore">Score</option>
                  <option value="product">Product</option>
                </select>
              </div>
              <div>
                <Label>Order</Label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
            
            {/* History Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-left">Goal</th>
                    <th className="p-3 text-left">Score</th>
                    <th className="p-3 text-left">Headline</th>
                  </tr>
                </thead>
                <tbody>
                  {data.analyses.map((analysis) => (
                    <tr key={analysis.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm">
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm font-medium">{analysis.product}</td>
                      <td className="p-3 text-sm">{analysis.goal}</td>
                      <td className="p-3 text-sm">
                        <span className="font-bold text-blue-600">{analysis.overallScore}/100</span>
                      </td>
                      <td className="p-3 text-sm">{analysis.headline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={data.analyses.length < limit}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Thumbnail History Tab Component
function ThumbnailHistoryTab() {
  const [sortBy, setSortBy] = useState<"createdAt" | "overallScore" | "videoTitle">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const limit = 10;
  
  const { data, isLoading } = trpc.creatorTools.getThumbnailHistory.useQuery({
    limit,
    offset: page * limit,
    sortBy,
    sortOrder,
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>YouTube Thumbnail History</CardTitle>
        <CardDescription>View and manage your past thumbnail generations</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading history...</p>}
        {data && data.analyses.length === 0 && (
          <p className="text-sm text-muted-foreground">No thumbnail analyses yet. Generate your first thumbnail!</p>
        )}
        {data && data.analyses.length > 0 && (
          <div className="space-y-4">
            {/* Sort Controls */}
            <div className="flex gap-4">
              <div>
                <Label>Sort By</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="createdAt">Date</option>
                  <option value="overallScore">Score</option>
                  <option value="videoTitle">Title</option>
                </select>
              </div>
              <div>
                <Label>Order</Label>
                <select
                  value="sortOrder"
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
            
            {/* History Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.analyses.map((analysis) => (
                <div key={analysis.id} className="border rounded-lg p-4 hover:bg-muted/50">
                  <img src={analysis.imageUrl} alt="Thumbnail" className="w-full rounded-lg mb-3" />
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">{analysis.videoTitle}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                      <span className="font-bold text-blue-600">{analysis.overallScore}/100</span>
                    </div>
                    <p className="text-xs">Niche: {analysis.niche}</p>
                    <p className="text-xs">Text: {analysis.textOverlay}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={data.analyses.length < limit}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Batch Ads Tab Component
function BatchAdsTab() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const batchGenerate = trpc.creatorTools.batchGenerateAds.useMutation();
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i];
        });
        return row;
      });
      
      setCsvData(rows);
    };
    reader.readAsText(file);
  };
  
  const handleBatchGenerate = async () => {
    if (csvData.length === 0) return;
    
    const rows = csvData.map(row => ({
      product: row.product || row.Product,
      audience: row.audience || row.Audience,
      goal: (row.goal || row.Goal || 'conversions') as any,
      description: row.description || row.Description,
      tone: (row.tone || row.Tone || 'professional') as any,
      budget: row.budget ? parseInt(row.budget) : undefined,
    }));
    
    await batchGenerate.mutateAsync({ rows });
  };
  
  const handleDownloadResults = () => {
    if (!batchGenerate.data) return;
    
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(
      batchGenerate.data.results.map((r: any) => ({
        Product: r.input.product,
        Audience: r.input.audience,
        Goal: r.input.goal,
        Success: r.success ? 'Yes' : 'No',
        Headline: r.data?.headline || r.error,
        Body: r.data?.bodyText || '',
        CTA: r.data?.cta || '',
        Score: r.data?.overallScore || 0,
        ImageURL: r.data?.imageUrl || '',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Batch Ads');
    XLSX.writeFile(workbook, 'batch-ads-results.xlsx');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Ad Generation</CardTitle>
        <CardDescription>
          Upload CSV with columns: product, audience, goal, description, tone, budget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="csv-upload">Upload CSV File</Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
          />
        </div>
        
        {csvData.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{csvData.length} rows loaded</p>
            <div className="border rounded-lg p-4 max-h-60 overflow-auto">
              <pre className="text-xs">{JSON.stringify(csvData.slice(0, 3), null, 2)}</pre>
              {csvData.length > 3 && <p className="text-xs text-muted-foreground mt-2">... and {csvData.length - 3} more</p>}
            </div>
          </div>
        )}
        
        <Button
          onClick={handleBatchGenerate}
          disabled={batchGenerate.isPending || csvData.length === 0}
          className="w-full"
        >
          {batchGenerate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate {csvData.length} Ads
        </Button>
        
        {batchGenerate.data && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="font-semibold">Batch Complete!</p>
              <p className="text-sm">Successful: {batchGenerate.data.successful}/{batchGenerate.data.total}</p>
            </div>
            <Button onClick={handleDownloadResults} className="w-full">
              Download Results (XLSX)
            </Button>
          </div>
        )}
        
        {batchGenerate.error && (
          <p className="text-sm text-destructive">Error: {batchGenerate.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Batch Thumbnails Tab Component
function BatchThumbnailsTab() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const batchGenerate = trpc.creatorTools.batchGenerateThumbnails.useMutation();
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i];
        });
        return row;
      });
      
      setCsvData(rows);
    };
    reader.readAsText(file);
  };
  
  const handleBatchGenerate = async () => {
    if (csvData.length === 0) return;
    
    const rows = csvData.map(row => ({
      videoTitle: row.videoTitle || row.VideoTitle || row.title || row.Title,
      niche: row.niche || row.Niche,
      style: (row.style || row.Style || 'bold') as any,
      customPrompt: row.customPrompt || row.CustomPrompt,
    }));
    
    await batchGenerate.mutateAsync({ rows });
  };
  
  const handleDownloadResults = () => {
    if (!batchGenerate.data) return;
    
    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(
      batchGenerate.data.results.map((r: any) => ({
        VideoTitle: r.input.videoTitle,
        Niche: r.input.niche,
        Style: r.input.style,
        Success: r.success ? 'Yes' : 'No',
        TextOverlay: r.data?.textOverlay || r.error,
        Score: r.data?.overallScore || 0,
        ImageURL: r.data?.imageUrl || '',
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Batch Thumbnails');
    XLSX.writeFile(workbook, 'batch-thumbnails-results.xlsx');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Thumbnail Generation</CardTitle>
        <CardDescription>
          Upload CSV with columns: videoTitle, niche, style, customPrompt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="csv-upload-thumb">Upload CSV File</Label>
          <Input
            id="csv-upload-thumb"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
          />
        </div>
        
        {csvData.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">{csvData.length} rows loaded</p>
            <div className="border rounded-lg p-4 max-h-60 overflow-auto">
              <pre className="text-xs">{JSON.stringify(csvData.slice(0, 3), null, 2)}</pre>
              {csvData.length > 3 && <p className="text-xs text-muted-foreground mt-2">... and {csvData.length - 3} more</p>}
            </div>
          </div>
        )}
        
        <Button
          onClick={handleBatchGenerate}
          disabled={batchGenerate.isPending || csvData.length === 0}
          className="w-full"
        >
          {batchGenerate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate {csvData.length} Thumbnails
        </Button>
        
        {batchGenerate.data && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="font-semibold">Batch Complete!</p>
              <p className="text-sm">Successful: {batchGenerate.data.successful}/{batchGenerate.data.total}</p>
            </div>
            <Button onClick={handleDownloadResults} className="w-full">
              Download Results (XLSX)
            </Button>
          </div>
        )}
        
        {batchGenerate.error && (
          <p className="text-sm text-destructive">Error: {batchGenerate.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

// A/B Testing Ads Tab Component
function ABTestingAdsTab() {
  const [abProduct, setAbProduct] = useState("");
  const [abAudience, setAbAudience] = useState("");
  const [abGoal, setAbGoal] = useState<"awareness" | "traffic" | "conversions" | "engagement">("conversions");
  const [abDescription, setAbDescription] = useState("");
  const [abBudget, setAbBudget] = useState("");
  const [variantCount, setVariantCount] = useState(3);
  
  const generateVariants = trpc.creatorTools.generateAdVariants.useMutation();
  
  const handleGenerateVariants = async () => {
    await generateVariants.mutateAsync({
      product: abProduct,
      targetAudience: abAudience,
      goal: abGoal,
      description: abDescription || undefined,
      budget: abBudget ? parseInt(abBudget) : undefined,
      variantCount,
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Testing - Facebook Ads</CardTitle>
        <CardDescription>Generate multiple ad variants and compare performance scores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ab-product">Product/Service</Label>
            <Input
              id="ab-product"
              value={abProduct}
              onChange={(e) => setAbProduct(e.target.value)}
              placeholder="e.g., AI Writing Tool"
            />
          </div>
          <div>
            <Label htmlFor="ab-audience">Target Audience</Label>
            <Input
              id="ab-audience"
              value={abAudience}
              onChange={(e) => setAbAudience(e.target.value)}
              placeholder="e.g., Content creators, 25-40"
            />
          </div>
          <div>
            <Label htmlFor="ab-goal">Campaign Goal</Label>
            <select
              id="ab-goal"
              value={abGoal}
              onChange={(e) => setAbGoal(e.target.value as any)}
              className="w-full p-2 border rounded-md"
            >
              <option value="awareness">Brand Awareness</option>
              <option value="traffic">Traffic</option>
              <option value="conversions">Conversions</option>
              <option value="engagement">Engagement</option>
            </select>
          </div>
          <div>
            <Label htmlFor="ab-variant-count">Number of Variants</Label>
            <select
              id="ab-variant-count"
              value={variantCount}
              onChange={(e) => setVariantCount(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              <option value="2">2 Variants</option>
              <option value="3">3 Variants</option>
            </select>
          </div>
        </div>
        
        <div>
          <Label htmlFor="ab-description">Product Description (Optional)</Label>
          <Textarea
            id="ab-description"
            value={abDescription}
            onChange={(e) => setAbDescription(e.target.value)}
            placeholder="Additional details about your product..."
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="ab-budget">Budget (Optional)</Label>
          <Input
            id="ab-budget"
            type="number"
            value={abBudget}
            onChange={(e) => setAbBudget(e.target.value)}
            placeholder="e.g., 500"
          />
        </div>
        
        <Button
          onClick={handleGenerateVariants}
          disabled={generateVariants.isPending || !abProduct || !abAudience}
          className="w-full"
        >
          {generateVariants.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate {variantCount} Variants
        </Button>
        
        {generateVariants.data && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="font-semibold">Best Performer: Variant {generateVariants.data.bestVariantIndex}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generateVariants.data.variants.map((variant: any, index: number) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    index + 1 === generateVariants.data.bestVariantIndex
                      ? 'border-green-500 bg-green-500/5'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Variant {variant.variantIndex}</h3>
                    <span className="text-sm font-bold text-blue-600">{variant.overallScore}/100</span>
                  </div>
                  
                  {variant.imageUrl && (
                    <img src={variant.imageUrl} alt="Ad Creative" className="w-full rounded-lg mb-3" />
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Tone</p>
                      <p className="font-medium">{variant.tone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Headline</p>
                      <p className="font-medium">{variant.headline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Body</p>
                      <p className="text-xs">{variant.bodyText}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CTA</p>
                      <p className="font-medium">{variant.cta}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Hook</p>
                        <p className="text-sm font-bold">{variant.hookScore}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTA</p>
                        <p className="text-sm font-bold">{variant.ctaScore}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {generateVariants.error && (
          <p className="text-sm text-destructive">Error: {generateVariants.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

// A/B Testing Thumbnails Tab Component
function ABTestingThumbnailsTab() {
  const [abTitle, setAbTitle] = useState("");
  const [abNiche, setAbNiche] = useState("");
  const [abCustomPrompt, setAbCustomPrompt] = useState("");
  const [variantCount, setVariantCount] = useState(3);
  
  const generateVariants = trpc.creatorTools.generateThumbnailVariants.useMutation();
  
  const handleGenerateVariants = async () => {
    await generateVariants.mutateAsync({
      videoTitle: abTitle,
      niche: abNiche,
      customPrompt: abCustomPrompt || undefined,
      variantCount,
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Testing - YouTube Thumbnails</CardTitle>
        <CardDescription>Generate multiple thumbnail variants and compare CTR scores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ab-title">Video Title</Label>
            <Input
              id="ab-title"
              value={abTitle}
              onChange={(e) => setAbTitle(e.target.value)}
              placeholder="e.g., 10 AI Tools That Will Change Your Life"
            />
          </div>
          <div>
            <Label htmlFor="ab-niche">Niche</Label>
            <Input
              id="ab-niche"
              value={abNiche}
              onChange={(e) => setAbNiche(e.target.value)}
              placeholder="e.g., Tech, Finance, Fitness"
            />
          </div>
          <div>
            <Label htmlFor="ab-variant-count-thumb">Number of Variants</Label>
            <select
              id="ab-variant-count-thumb"
              value={variantCount}
              onChange={(e) => setVariantCount(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              <option value="2">2 Variants</option>
              <option value="3">3 Variants</option>
            </select>
          </div>
        </div>
        
        <div>
          <Label htmlFor="ab-custom-prompt">Custom Prompt (Optional)</Label>
          <Textarea
            id="ab-custom-prompt"
            value={abCustomPrompt}
            onChange={(e) => setAbCustomPrompt(e.target.value)}
            placeholder="Additional visual requirements..."
            rows={3}
          />
        </div>
        
        <Button
          onClick={handleGenerateVariants}
          disabled={generateVariants.isPending || !abTitle || !abNiche}
          className="w-full"
        >
          {generateVariants.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate {variantCount} Variants
        </Button>
        
        {generateVariants.data && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="font-semibold">Best Performer: Variant {generateVariants.data.bestVariantIndex}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generateVariants.data.variants.map((variant: any, index: number) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    index + 1 === generateVariants.data.bestVariantIndex
                      ? 'border-green-500 bg-green-500/5'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Variant {variant.variantIndex}</h3>
                    <span className="text-sm font-bold text-blue-600">{variant.overallScore}/100</span>
                  </div>
                  
                  {variant.imageUrl && (
                    <img src={variant.imageUrl} alt="Thumbnail" className="w-full rounded-lg mb-3" />
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Style</p>
                      <p className="font-medium">{variant.style}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Text Overlay</p>
                      <p className="font-medium">{variant.textOverlay}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">CTR Score</p>
                        <p className="text-sm font-bold">{variant.ctrScore}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Emotion</p>
                        <p className="text-sm font-bold">{variant.emotionScore}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Predicted CTR</p>
                      <p className="text-sm font-bold">{variant.predictedMetrics.ctr}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {generateVariants.error && (
          <p className="text-sm text-destructive">Error: {generateVariants.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
