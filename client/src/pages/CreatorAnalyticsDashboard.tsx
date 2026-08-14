import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Eye, Heart, MessageCircle, Share2, DollarSign } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "bg-black",
  instagram: "bg-gradient-to-br from-purple-600 to-pink-500",
  youtube: "bg-red-600",
  twitter: "bg-blue-500",
  facebook: "bg-blue-700",
};

export function CreatorAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: analyticsAvailability, isLoading: loadingAvailability } = trpc.creatorAnalytics.analyticsAvailability.useQuery();
  const { data: overviewStats, isLoading: loadingOverview } = trpc.creatorAnalytics.getOverviewStats.useQuery({
    days: parseInt(timeRange, 10),
  });
  const { data: platformBreakdown, isLoading: loadingBreakdown } = trpc.creatorAnalytics.getPlatformBreakdown.useQuery({
    days: parseInt(timeRange, 10),
  });
  const { data: topPosts, isLoading: loadingTopPosts } = trpc.creatorAnalytics.getTopPerformingPosts.useQuery({
    limit: 5,
  });

  const hasVerifiedActivity = Boolean(analyticsAvailability?.hasVerifiedActivity);
  const stats = overviewStats ?? {
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    avgEngagementRate: 0,
    totalRevenue: 0,
    totalPosts: 0,
    followersGained: 0,
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loadingAvailability) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Opening your Learning Room…</div>
      </div>
    );
  }

  if (!hasVerifiedActivity) {
    return (
      <div className="container max-w-5xl py-8 space-y-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">CreatorVault / Learn</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Your Learning Room</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">This is where real audience movement starts speaking back to you.</p>
        </div>
        <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Nothing has spoken back yet.</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">There is no verified audience history in CreatorVault for this room yet. We will not turn silence into numbers or make up a money story.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <a href="/social-hub" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Get your next moment ready</a>
            <a href="/vault-x/studio" className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold">Start with Body Cinema</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">CreatorVault / Learn</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Your Learning Room</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">See what people actually did with your moments after CreatorVault recorded it.</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { title: "People reached", value: formatNumber(stats.totalViews), detail: `${stats.totalPosts} recorded moments`, icon: Eye },
          { title: "Ways they reacted", value: `${stats.avgEngagementRate.toFixed(1)}%`, detail: `${formatNumber(stats.totalLikes)} likes recorded`, icon: Heart },
          { title: "New people who found you", value: `+${formatNumber(stats.followersGained)}`, detail: `Last ${timeRange} days`, icon: TrendingUp },
          { title: "Money tied to this history", value: formatCurrency(stats.totalRevenue), detail: "Recorded only after it appears", icon: DollarSign },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{item.title}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent>{loadingOverview ? <Loader2 className="h-6 w-6 animate-spin" /> : <><div className="text-2xl font-bold">{item.value}</div><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></>}</CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Where your moments landed</CardTitle><CardDescription>Only recorded audience history appears here.</CardDescription></CardHeader>
          <CardContent>
            {loadingBreakdown ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : platformBreakdown && platformBreakdown.length > 0 ? (
              <div className="space-y-4">
                {platformBreakdown.map((platform) => (
                  <div key={platform.platform} className="space-y-2 rounded-xl border border-border/70 p-3">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className={`h-3 w-3 rounded-full ${PLATFORM_COLORS[platform.platform] ?? "bg-muted-foreground"}`} /><span className="font-bold capitalize">{platform.platform}</span></div><span className="text-sm text-muted-foreground">{formatNumber(platform.views)} views</span></div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground"><div className="flex items-center gap-1"><Heart className="h-3 w-3" />{formatNumber(platform.likes)}</div><div className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{formatNumber(platform.comments)}</div><div className="flex items-center gap-1"><Share2 className="h-3 w-3" />{formatNumber(platform.shares)}</div></div>
                  </div>
                ))}
              </div>
            ) : <div className="py-8 text-center text-muted-foreground"><p className="font-medium">No recorded attention in this window yet.</p><p className="mt-2 text-sm">The history stays honest even when there is nothing to show.</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Moments people stopped for</CardTitle><CardDescription>Your most-watched recorded moments.</CardDescription></CardHeader>
          <CardContent>
            {loadingTopPosts ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : topPosts && topPosts.length > 0 ? (
              <div className="space-y-3">
                {topPosts.map((post: any, index: number) => (
                  <div key={post.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{index + 1}</div><div className="min-w-0 flex-1"><Badge variant="secondary" className="text-xs capitalize">{post.platform}</Badge><div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatNumber(post.views || 0)}</span><span className="flex items-center gap-1"><Heart className="h-3 w-3" />{formatNumber(post.likes || 0)}</span><span>{post.engagementRate}% reacted</span></div></div></div>
                ))}
              </div>
            ) : <div className="py-8 text-center text-muted-foreground"><p className="font-medium">No recorded moments in this window yet.</p></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
