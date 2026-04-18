import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, 
  ShoppingBag, 
  GraduationCap, 
  Wrench, 
  Send, 
  MessageSquare,
  Zap,
  History,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

export default function CommandHub() {
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  // Product creation
  const [productTitle, setProductTitle] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productType, setProductType] = useState<"digital" | "service" | "bundle" | "subscription">("digital");

  // Course creation
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [isFree, setIsFree] = useState(false);

  // Service creation
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceTier, setServiceTier] = useState<"low" | "mid" | "high">("mid");
  const [deliveryDays, setDeliveryDays] = useState("7");

  // Telegram broadcast
  const [telegramBotId, setTelegramBotId] = useState("");
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramTargets, setTelegramTargets] = useState("100");

  // WhatsApp campaign
  const [whatsappProviderId, setWhatsappProviderId] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [whatsappTargets, setWhatsappTargets] = useState("100");

  // Viral analysis
  const [viralTitle, setViralTitle] = useState("");
  const [viralDesc, setViralDesc] = useState("");
  const [viralPlatform, setViralPlatform] = useState("tiktok");
  const [viralTags, setViralTags] = useState("");

  const createProductMutation = trpc.commandHub.createProduct.useMutation({
    onSuccess: (data) => {
      toast.success(`Product created! ID: ${data.output.productId}`);
      setProductTitle("");
      setProductDesc("");
      setProductPrice("");
      setActiveCommand(null);
      refetchHistory();
    },
    onError: (error) => toast.error(error.message),
  });

  const createCourseMutation = trpc.commandHub.createCourse.useMutation({
    onSuccess: (data) => {
      toast.success(`Course created! ID: ${data.output.courseId}`);
      setCourseTitle("");
      setCourseDesc("");
      setCoursePrice("");
      setActiveCommand(null);
      refetchHistory();
    },
    onError: (error) => toast.error(error.message),
  });

  const createServiceMutation = trpc.commandHub.createService.useMutation({
    onSuccess: (data) => {
      toast.success(`Service created! ID: ${data.output.offerId}`);
      setServiceTitle("");
      setServiceDesc("");
      setServicePrice("");
      setActiveCommand(null);
      refetchHistory();
    },
    onError: (error) => toast.error(error.message),
  });

  const telegramBroadcastMutation = trpc.commandHub.sendTelegramBroadcast.useMutation({
    onSuccess: (data) => {
      toast.success(`Telegram broadcast sent to ${data.output.targetCount} users!`);
      setTelegramMessage("");
      setActiveCommand(null);
      refetchHistory();
    },
    onError: (error) => toast.error(error.message),
  });

  const whatsappCampaignMutation = trpc.commandHub.sendWhatsAppCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(`WhatsApp campaign sent to ${data.output.targetCount} users!`);
      setWhatsappMessage("");
      setActiveCommand(null);
      refetchHistory();
    },
    onError: (error) => toast.error(error.message),
  });

  const viralAnalysisMutation = trpc.commandHub.runViralAnalysis.useMutation({
    onSuccess: (data) => {
      toast.success(`Viral analysis complete! Score: ${data.output.viralScore}/100`);
      setViralTitle("");
      setViralDesc("");
      setViralTags("");
      setActiveCommand(null);
      refetchHistory();
    },
    onError: (error) => toast.error(error.message),
  });

  const { data: history, refetch: refetchHistory } = trpc.commandHub.getHistory.useQuery({ limit: 20 });
  const { data: stats } = trpc.commandHub.getStats.useQuery();

  const commands = [
    { id: "product", label: "Create Product", icon: ShoppingBag, color: "bg-purple-500" },
    { id: "course", label: "Create Course", icon: GraduationCap, color: "bg-blue-500" },
    { id: "service", label: "Create Service", icon: Wrench, color: "bg-green-500" },
    { id: "telegram", label: "Telegram Broadcast", icon: Send, color: "bg-cyan-500" },
    { id: "whatsapp", label: "WhatsApp Campaign", icon: MessageSquare, color: "bg-emerald-500" },
    { id: "viral", label: "Viral Analysis", icon: Zap, color: "bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Hub</span>
          </h1>
          <p className="text-xl text-gray-300">
            Execute commands with real database effects. Every button performs API calls.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Commands</p>
                    <p className="text-3xl font-bold text-white">{stats.totalCommands}</p>
                  </div>
                  <BarChart3 className="h-10 w-10 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Success Rate</p>
                    <p className="text-3xl font-bold text-green-400">
                      {stats.totalCommands > 0 
                        ? Math.round((stats.successCount / stats.totalCommands) * 100)
                        : 0}%
                    </p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Errors</p>
                    <p className="text-3xl font-bold text-red-400">{stats.errorCount}</p>
                  </div>
                  <XCircle className="h-10 w-10 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Command Buttons */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Available Commands</CardTitle>
                <CardDescription className="text-gray-400">
                  Select a command to execute
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {commands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => setActiveCommand(cmd.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        activeCommand === cmd.id
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <cmd.icon className={`h-8 w-8 mx-auto mb-2 text-white`} />
                      <p className="text-sm text-white text-center">{cmd.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Command Forms */}
            {activeCommand === "product" && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Create Product</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Title</Label>
                    <Input
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={productDesc}
                      onChange={(e) => setProductDesc(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Product description"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Price (USD)</Label>
                    <Input
                      type="number"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Type</Label>
                    <Select value={productType} onValueChange={(v: any) => setProductType(v)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="bundle">Bundle</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      createProductMutation.mutate({
                        title: productTitle,
                        description: productDesc,
                        price: parseFloat(productPrice),
                        type: productType,
                      });
                    }}
                    disabled={!productTitle || !productDesc || !productPrice || createProductMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {createProductMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Execute Command"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeCommand === "course" && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Create Course</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Title</Label>
                    <Input
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={courseDesc}
                      onChange={(e) => setCourseDesc(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Price (USD)</Label>
                    <Input
                      type="number"
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      disabled={isFree}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label className="text-gray-300">Free Course</Label>
                  </div>
                  <Button
                    onClick={() => {
                      createCourseMutation.mutate({
                        title: courseTitle,
                        description: courseDesc,
                        price: isFree ? 0 : parseFloat(coursePrice),
                        isFree,
                      });
                    }}
                    disabled={!courseTitle || !courseDesc || createCourseMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {createCourseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Execute Command"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeCommand === "service" && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Create Service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Title</Label>
                    <Input
                      value={serviceTitle}
                      onChange={(e) => setServiceTitle(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={serviceDesc}
                      onChange={(e) => setServiceDesc(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Price (USD)</Label>
                    <Input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Tier</Label>
                    <Select value={serviceTier} onValueChange={(v: any) => setServiceTier(v)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low ($10-$50)</SelectItem>
                        <SelectItem value="mid">Mid ($50-$200)</SelectItem>
                        <SelectItem value="high">High ($200+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Delivery Days</Label>
                    <Input
                      type="number"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      createServiceMutation.mutate({
                        title: serviceTitle,
                        description: serviceDesc,
                        price: parseFloat(servicePrice),
                        tier: serviceTier,
                        deliveryDays: parseInt(deliveryDays),
                      });
                    }}
                    disabled={!serviceTitle || !serviceDesc || !servicePrice || createServiceMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {createServiceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Execute Command"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeCommand === "telegram" && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Telegram Broadcast</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Bot ID</Label>
                    <Input
                      value={telegramBotId}
                      onChange={(e) => setTelegramBotId(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="bot_123456"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Message</Label>
                    <Textarea
                      value={telegramMessage}
                      onChange={(e) => setTelegramMessage(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Your broadcast message"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Target Count</Label>
                    <Input
                      type="number"
                      value={telegramTargets}
                      onChange={(e) => setTelegramTargets(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      telegramBroadcastMutation.mutate({
                        botId: telegramBotId,
                        message: telegramMessage,
                        targetCount: parseInt(telegramTargets),
                      });
                    }}
                    disabled={!telegramBotId || !telegramMessage || telegramBroadcastMutation.isPending}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {telegramBroadcastMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Execute Command"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeCommand === "whatsapp" && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">WhatsApp Campaign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Provider ID</Label>
                    <Input
                      value={whatsappProviderId}
                      onChange={(e) => setWhatsappProviderId(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="provider_123456"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Message</Label>
                    <Textarea
                      value={whatsappMessage}
                      onChange={(e) => setWhatsappMessage(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Your campaign message"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Target Count</Label>
                    <Input
                      type="number"
                      value={whatsappTargets}
                      onChange={(e) => setWhatsappTargets(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      whatsappCampaignMutation.mutate({
                        providerId: whatsappProviderId,
                        message: whatsappMessage,
                        targetCount: parseInt(whatsappTargets),
                      });
                    }}
                    disabled={!whatsappProviderId || !whatsappMessage || whatsappCampaignMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {whatsappCampaignMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Execute Command"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeCommand === "viral" && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Viral Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Title</Label>
                    <Input
                      value={viralTitle}
                      onChange={(e) => setViralTitle(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={viralDesc}
                      onChange={(e) => setViralDesc(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Platform</Label>
                    <Select value={viralPlatform} onValueChange={setViralPlatform}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Tags (comma separated)</Label>
                    <Input
                      value={viralTags}
                      onChange={(e) => setViralTags(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="viral, trending, funny"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      viralAnalysisMutation.mutate({
                        title: viralTitle,
                        description: viralDesc,
                        platform: viralPlatform,
                        tags: viralTags,
                      });
                    }}
                    disabled={!viralTitle || !viralDesc || viralAnalysisMutation.isPending}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {viralAnalysisMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Execute Command"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Command History */}
          <div>
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Command History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {history && history.length > 0 ? (
                    <div className="space-y-3">
                      {history.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <Badge
                              className={
                                event.outcome === "success"
                                  ? "bg-green-500"
                                  : event.outcome === "error"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                              }
                            >
                              {event.eventType}
                            </Badge>
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-400">
                            {event.channel} • {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No commands executed yet</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
