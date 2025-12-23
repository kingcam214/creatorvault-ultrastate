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

  const generateViralHooks = trpc.creatorTools.generateViralHooks.useMutation();
  const generateCaption = trpc.creatorTools.generateCaption.useMutation();
  const generateTelegramBroadcast = trpc.creatorTools.generateTelegramBroadcast.useMutation();
  const generateWhatsappCampaign = trpc.creatorTools.generateWhatsAppCampaign.useMutation();
  const generateStrategy = trpc.creatorTools.generateContentStrategy.useMutation();
  const analyzeViral = trpc.creatorTools.analyzeViralPotential.useMutation();

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

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Creator Tools
        </h1>
        <p className="text-muted-foreground mt-2">
          AI-powered tools to generate viral content, captions, and campaigns
        </p>
      </div>

      <Tabs defaultValue="hooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="hooks">Viral Hooks</TabsTrigger>
          <TabsTrigger value="caption">Captions</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
