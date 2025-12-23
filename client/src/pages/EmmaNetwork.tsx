/**
 * 🌐 EMMA NETWORK DASHBOARD
 * 
 * Manage Emma's 2,000+ Dominican Republic creator network
 * Import, track, and onboard DR creators
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Upload, 
  MapPin, 
  TrendingUp, 
  Instagram, 
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmmaNetwork() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch Emma Network stats
  const { data: stats, isLoading } = trpc.emmaNetwork.getStats.useQuery();
  const { data: creators } = trpc.emmaNetwork.getAll.useQuery();

  // Import mutation
  const importMutation = trpc.emmaNetwork.import.useMutation({
    onSuccess: (result) => {
      toast({
        title: "Import Complete",
        description: `✅ ${result.success} creators imported, ${result.duplicates} duplicates skipped, ${result.failed} failed`,
      });
      setCsvFile(null);
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
  };

  const handleImport = async () => {
    if (!csvFile) return;

    setIsUploading(true);
    const text = await csvFile.text();
    importMutation.mutate({ csvContent: text });
  };

  // Redirect if not admin/owner
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-gray-300">
              Emma Network dashboard is only accessible to admins.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const statusColors = {
    pending: "bg-gray-500",
    contacted: "bg-blue-500",
    interested: "bg-yellow-500",
    onboarded: "bg-green-500",
    declined: "bg-red-500",
  };

  const statusIcons = {
    pending: Clock,
    contacted: MessageCircle,
    interested: TrendingUp,
    onboarded: CheckCircle,
    declined: XCircle,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🌐 Emma Network
          </h1>
          <p className="text-gray-300">
            2,000+ Dominican Republic Creator Network
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">Total Creators</p>
                  <p className="text-3xl font-bold text-white">
                    {isLoading ? "..." : stats?.total || 0}
                  </p>
                </div>
                <div className="bg-purple-500 text-white p-3 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">Onboarded</p>
                  <p className="text-3xl font-bold text-white">
                    {isLoading ? "..." : stats?.byStatus.onboarded || 0}
                  </p>
                </div>
                <div className="bg-green-500 text-white p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">Contacted</p>
                  <p className="text-3xl font-bold text-white">
                    {isLoading ? "..." : stats?.byStatus.contacted || 0}
                  </p>
                </div>
                <div className="bg-blue-500 text-white p-3 rounded-lg">
                  <MessageCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-white">
                    {isLoading ? "..." : stats?.byStatus.pending || 0}
                  </p>
                </div>
                <div className="bg-gray-500 text-white p-3 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Section */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Creators
            </CardTitle>
            <CardDescription className="text-gray-300">
              Upload CSV file with creator data (name, instagram, tiktok, contentType, city, status)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="bg-white/10 border-white/20 text-white"
              />
              <Button
                onClick={handleImport}
                disabled={!csvFile || isUploading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isUploading ? "Importing..." : "Import"}
              </Button>
            </div>
            {csvFile && (
              <p className="text-sm text-gray-300 mt-2">
                Selected: {csvFile.name}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="all">All Creators</TabsTrigger>
            <TabsTrigger value="cities">By City</TabsTrigger>
            <TabsTrigger value="content">By Content Type</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">All Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creators?.map((creator: any) => (
                    <div
                      key={creator.id}
                      className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">
                            {creator.user?.name || "Unknown"}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-300 mb-2">
                            {creator.instagram && (
                              <span className="flex items-center gap-1">
                                <Instagram className="w-4 h-4" />
                                {creator.instagram}
                              </span>
                            )}
                            {creator.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {creator.city}
                              </span>
                            )}
                          </div>
                          {creator.contentTags && creator.contentTags.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {creator.contentTags.map((tag: string) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="bg-purple-500/20 text-purple-200"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge
                          className={`${
                            creator.onboardedDate
                              ? statusColors.onboarded
                              : creator.contactDate
                              ? statusColors.contacted
                              : statusColors.pending
                          } text-white`}
                        >
                          {creator.onboardedDate
                            ? "Onboarded"
                            : creator.contactDate
                            ? "Contacted"
                            : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cities" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Creators by City</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.byCity &&
                    Object.entries(stats.byCity)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([city, count]) => (
                        <div
                          key={city}
                          className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                        >
                          <span className="text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-400" />
                            {city}
                          </span>
                          <Badge className="bg-purple-500 text-white">
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Creators by Content Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.byContentType &&
                    Object.entries(stats.byContentType)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                        >
                          <span className="text-white capitalize">{type}</span>
                          <Badge className="bg-pink-500 text-white">
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
