import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Eye, Heart, MessageCircle, Share2, DollarSign, Target, Sparkles, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-black",
  instagram: "bg-gradient-to-br from-purple-600 to-pink-500",
  youtube: "bg-red-600",
  twitter: "bg-blue-500",
  facebook: "bg-blue-700",
};

export function CreatorAnalyticsDashboard() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("30");

  const { data: overviewStats, isLoading: loadingOverview } = trpc.creatorAnalytics.getOverviewStats.useQuery({
    days: parseInt(timeRange),
  });

  const { data: platformBreakdown, isLoading: loadingBreakdown } = trpc.creatorAnalytics.getPlatformBreakdown.useQuery({
    days: parseInt(timeRange),
  });

  const { data: topPosts, isLoading: loadingTopPosts } = trpc.creatorAnalytics.getTopPerformingPosts.useQuery({
    limit: 5,
  });

  const { data: growthTrends, isLoading: loadingTrends } = trpc.creatorAnalytics.getGrowthTrends.useQuery({
    days: parseInt(timeRange),
  });

  const { data: milestones, isLoading: loadingMilestones } = trpc.creatorAnalytics.getMonetizationMilestones.useQuery();

  const { data: revenueProjections, isLoading: loadingProjections } = trpc.creatorAnalytics.getRevenueProjections.useQuery();

  const refreshMutation = trpc.creatorAnalytics.refreshMetrics.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Metrics refreshed",
        description: `Synced ${data.synced} posts from platform APIs`,
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Creator Analytics</h1>
          <p className="text-muted-foreground">
            Track your growth across all platforms. Monetization milestones and revenue projections.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatNumber(overviewStats?.totalViews || 0)}</div>
                <p className="text-xs text-muted-foreground">{overviewStats?.totalPosts || 0} posts</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overviewStats?.avgEngagementRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(overviewStats?.totalLikes || 0)} likes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers Gained</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">+{formatNumber(overviewStats?.followersGained || 0)}</div>
                <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(overviewStats?.totalRevenue || 0)}</div>
                <p className="text-xs text-muted-foreground">From all platforms</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>Performance by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBreakdown ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : platformBreakdown && platformBreakdown.length > 0 ? (
              <div className="space-y-4">
                {platformBreakdown.map((platform) => (
                  <div key={platform.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${PLATFORM_COLORS[platform.platform]}`} />
                        <span className="font-medium capitalize">{platform.platform}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatNumber(platform.views)} views</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {formatNumber(platform.likes)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {formatNumber(platform.comments)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        {formatNumber(platform.shares)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No data yet</p>
                <p className="text-sm mt-2">Connect platforms and post content to see analytics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>Highest viewed content</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTopPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : topPosts && topPosts.length > 0 ? (
              <div className="space-y-3">
                {topPosts.map((post, idx) => (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded border">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {post.platform}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(post.views || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatNumber(post.likes || 0)}
                        </span>
                        <span>{post.engagementRate}% eng.</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No posts yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monetization Milestones */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Monetization Milestones
          </CardTitle>
          <CardDescription>Track your progress toward platform payout thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMilestones ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : milestones && milestones.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="space-y-3 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium capitalize">{milestone.platform}</div>
                      <div className="text-sm text-muted-foreground">{milestone.thresholdType.replace(/_/g, " ")}</div>
                    </div>
                    <Badge variant={milestone.status === "achieved" ? "default" : "secondary"}>
                      {milestone.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>
                        {formatNumber(milestone.currentValue)} / {formatNumber(milestone.targetValue)} {milestone.unit}
                      </span>
                      <span className="font-medium">{milestone.progressPercentage}%</span>
                    </div>
                    <Progress value={milestone.progressPercentage} className="h-2" />
                  </div>
                  {milestone.payoutAmount && (
                    <div className="text-sm text-muted-foreground">
                      Est. payout: {formatCurrency(milestone.payoutAmount)}/month
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No milestones yet</p>
              <p className="text-sm mt-2">Connect platforms to track monetization progress</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Projections */}
      {revenueProjections && revenueProjections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Revenue Projections
            </CardTitle>
            <CardDescription>AI-powered earnings forecast based on current growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: "30 Days", value: revenueProjections[0].projected30dRevenue },
                { label: "90 Days", value: revenueProjections[0].projected90dRevenue },
                { label: "180 Days", value: revenueProjections[0].projected180dRevenue },
                { label: "1 Year", value: revenueProjections[0].projected365dRevenue },
              ].map((projection) => (
                <div key={projection.label} className="text-center p-4 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">{projection.label}</div>
                  <div className="text-2xl font-bold">{formatCurrency(projection.value || 0)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                {parseFloat(revenueProjections[0].growthRate || "0").toFixed(1)}% monthly growth rate
              </span>
              <Badge variant="outline" className="ml-auto">
                {revenueProjections[0].confidenceScore}% confidence
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
