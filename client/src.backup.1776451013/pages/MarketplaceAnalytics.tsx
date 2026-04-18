import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Eye, ShoppingCart, DollarSign, Users, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function MarketplaceAnalytics() {
  const [, params] = useRoute("/marketplace/analytics/:productId");
  const [, navigate] = useLocation();
  const productId = params?.productId;

  const { data: product, isLoading } = trpc.marketplace.getProduct.useQuery({ productId: productId! }, { enabled: !!productId });
  const { data: analytics } = trpc.marketplace.getProductAnalytics.useQuery({ productId: productId! }, { enabled: !!productId });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white">
        <div className="container py-8">Loading analytics...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white">
        <div className="container py-8">Product not found</div>
      </div>
    );
  }

  const conversionRate = analytics?.views > 0 ? ((analytics?.sales || 0) / analytics?.views) * 100 : 0;
  const avgOrderValue = analytics?.sales > 0 ? (analytics?.revenue || 0) / analytics?.sales : 0;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/marketplace/manage")}
            className="mb-4 bg-transparent border-gray-700 text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] bg-clip-text text-transparent">
                Product Analytics
              </h1>
              <p className="text-gray-400">{product.title}</p>
            </div>
            <Badge
              variant="secondary"
              className={
                product.status === "active"
                  ? "bg-green-500/20 text-green-400"
                  : product.status === "draft"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-gray-500/20 text-gray-400"
              }
            >
              {product.status}
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Views</p>
                  <p className="text-3xl font-bold text-white mt-2">{analytics?.views || 0}</p>
                  <p className="text-sm text-green-400 mt-1">+{analytics?.viewsGrowth || 0}% this week</p>
                </div>
                <Eye className="w-12 h-12 text-[#00AEEF]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Sales</p>
                  <p className="text-3xl font-bold text-white mt-2">{analytics?.sales || 0}</p>
                  <p className="text-sm text-green-400 mt-1">+{analytics?.salesGrowth || 0}% this week</p>
                </div>
                <ShoppingCart className="w-12 h-12 text-[#7B2CBF]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    ${((analytics?.revenue || 0) / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your cut: ${(((analytics?.revenue || 0) * 0.7) / 100).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-[#00AEEF]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Conversion Rate</p>
                  <p className="text-3xl font-bold text-white mt-2">{conversionRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Avg order: ${(avgOrderValue / 100).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-[#7B2CBF]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Over Time */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Sales Over Time</CardTitle>
              <CardDescription className="text-gray-400">Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p>Chart visualization coming soon</p>
                  <p className="text-sm mt-2">Daily sales breakdown</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Traffic Sources</CardTitle>
              <CardDescription className="text-gray-400">Where your views come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.trafficSources?.map((source: any) => (
                  <div key={source.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#00AEEF]" />
                      <span className="text-white">{source.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{source.views}</p>
                      <p className="text-sm text-gray-400">{source.percentage}%</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p>No traffic data yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Buyers */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Top Buyers</CardTitle>
              <CardDescription className="text-gray-400">Customers who purchased this product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topBuyers?.map((buyer: any) => (
                  <div key={buyer.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] flex items-center justify-center text-white font-semibold">
                        {buyer.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{buyer.name}</p>
                        <p className="text-sm text-gray-400">{buyer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white">${(buyer.amount / 100).toFixed(2)}</p>
                      <p className="text-sm text-gray-400">{buyer.date}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p>No purchases yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Revenue Breakdown</CardTitle>
              <CardDescription className="text-gray-400">70/30 creator split</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Gross Revenue</span>
                    <span className="text-white font-semibold">
                      ${((analytics?.revenue || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF]" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Your Earnings (70%)</span>
                    <span className="text-[#00AEEF] font-semibold">
                      ${(((analytics?.revenue || 0) * 0.7) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00AEEF]" style={{ width: "70%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Platform Fee (30%)</span>
                    <span className="text-gray-400 font-semibold">
                      ${(((analytics?.revenue || 0) * 0.3) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-600" style={{ width: "30%" }} />
                  </div>
                </div>

                {product.recruiterId && (
                  <div className="pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400 mb-2">
                      Recruiter bonus: 10% of platform fee
                    </p>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Recruiter Earnings</span>
                      <span className="text-[#7B2CBF] font-semibold">
                        ${(((analytics?.revenue || 0) * 0.03) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Details */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-400 text-sm mb-1">Product Type</p>
                <p className="text-white">{product.type}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Category</p>
                <p className="text-white">{product.category || "Uncategorized"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Price</p>
                <p className="text-white">${(product.priceAmount / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Created</p>
                <p className="text-white">{new Date(product.createdAt).toLocaleDateString()}</p>
              </div>
              {product.publishedAt && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Published</p>
                  <p className="text-white">{new Date(product.publishedAt).toLocaleDateString()}</p>
                </div>
              )}
              {product.keywords && product.keywords.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-gray-400 text-sm mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {product.keywords.map((keyword: string) => (
                      <Badge key={keyword} variant="secondary" className="bg-[#00AEEF]/20 text-[#00AEEF]">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
