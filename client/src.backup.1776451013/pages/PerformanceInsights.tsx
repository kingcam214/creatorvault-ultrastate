/**
 * Performance Insights
 * 
 * Show creators what content performs best
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PerformanceInsights() {
  const { data: topContent, isLoading } = trpc.performanceFeedback.getTopContent.useQuery({ limit: 10 });

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Performance Insights</h1>
        <p className="text-muted-foreground mt-2">
          Learn what content performs best
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading insights...
          </CardContent>
        </Card>
      ) : !topContent || topContent.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-bold mb-2">No Performance Data Yet</h3>
            <p className="text-muted-foreground">
              Publish content and metrics will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {topContent.map((content: any, index: number) => (
            <Card key={content.contentId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-muted-foreground">#{index + 1}</span>
                    <span>{content.title || `Content ${content.contentId.slice(0, 8)}`}</span>
                  </CardTitle>
                  <span className="text-sm text-muted-foreground capitalize">{content.platform}</span>
                </div>
                <CardDescription>
                  Published {new Date(content.publishedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Views</p>
                    <p className="text-2xl font-bold">{formatNumber(content.views)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Likes</p>
                    <p className="text-2xl font-bold text-red-500">{formatNumber(content.likes)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shares</p>
                    <p className="text-2xl font-bold text-blue-500">{formatNumber(content.shares)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Comments</p>
                    <p className="text-2xl font-bold text-green-500">{formatNumber(content.comments)}</p>
                  </div>
                </div>

                {content.engagementRate && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                    <p className="text-xl font-bold text-purple-600">
                      {(content.engagementRate * 100).toFixed(2)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
