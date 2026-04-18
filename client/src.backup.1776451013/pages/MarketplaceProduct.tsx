import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart, Package, Star, TrendingUp, Shield, Download, Truck, Clock } from "lucide-react";

export default function MarketplaceProduct() {
  const [, params] = useRoute("/marketplace/:productId");
  const [, navigate] = useLocation();
  const productId = params?.productId;
  const [selectedImage, setSelectedImage] = useState(0);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);

  const { data: product, isLoading } = trpc.marketplace.getProduct.useQuery(
    { productId: productId! },
    { enabled: !!productId }
  );

  const createCheckout = trpc.marketplace.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create checkout session");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white">
        <div className="container py-8">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white">
        <div className="container py-8">
          <p className="text-gray-400 mb-4">Product not found</p>
          <Button onClick={() => navigate("/marketplace")} variant="outline" className="bg-transparent border-gray-700">
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const images = [product.mainImage, ...(product.additionalImages || [])].filter(Boolean);
  const currentPrice = product.salePrice || product.priceAmount;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <div className="container py-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate("/marketplace")}
          className="mb-6 bg-transparent border-gray-700 text-white hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        {/* Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left: Images */}
          <div>
            <div className="aspect-square bg-gray-800 rounded-lg mb-4 overflow-hidden">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-600" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square bg-gray-800 rounded cursor-pointer overflow-hidden border-2 ${
                      selectedImage === idx ? "border-[#00AEEF]" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2 text-white">{product.title}</h1>
                <p className="text-gray-400">{product.category}</p>
              </div>
              <Badge variant="secondary" className="bg-[#7B2CBF] text-white">
                {product.type}
              </Badge>
            </div>

            <p className="text-xl text-gray-300 mb-6">{product.shortDescription}</p>

            <div className="flex items-center gap-4 mb-6">
              {product.salesCount > 0 && (
                <div className="flex items-center gap-2 text-gray-400">
                  <TrendingUp className="w-5 h-5" />
                  <span>{product.salesCount} sales</span>
                </div>
              )}
              {product.viewCount > 0 && (
                <div className="flex items-center gap-2 text-gray-400">
                  <span>{product.viewCount} views</span>
                </div>
              )}
            </div>

            {/* Price */}
            <Card className="bg-[#1A1A1A] border-gray-800 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-4xl font-bold text-[#00AEEF]">
                      ${(currentPrice / 100).toFixed(2)}
                    </div>
                    {product.salePrice && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg text-gray-400 line-through">
                          ${(product.priceAmount / 100).toFixed(2)}
                        </span>
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                          Save ${((product.priceAmount - product.salePrice) / 100).toFixed(2)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {product.salesCount === 0 && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      New Launch
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={() => setCheckoutDialogOpen(true)}
                  className="w-full bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90 text-lg py-6"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Buy Now
                </Button>

                {product.monthlyPrice && (
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Or pay monthly:</p>
                    <p className="text-xl font-semibold text-white">
                      ${(product.monthlyPrice / 100).toFixed(2)}/month
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Features */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {product.type === "digital" && (
                    <>
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5 text-[#00AEEF]" />
                        <div>
                          <p className="text-white font-semibold">Instant Download</p>
                          <p className="text-sm text-gray-400">
                            {product.downloadLimit ? `${product.downloadLimit} downloads` : "Unlimited downloads"}
                          </p>
                        </div>
                      </div>
                      {product.accessDuration && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-[#00AEEF]" />
                          <div>
                            <p className="text-white font-semibold">Access Duration</p>
                            <p className="text-sm text-gray-400">{product.accessDuration} days</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {product.type === "physical" && (
                    <>
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-[#00AEEF]" />
                        <div>
                          <p className="text-white font-semibold">Shipping</p>
                          <p className="text-sm text-gray-400">
                            ${(product.shippingCost / 100).toFixed(2)} - Arrives in {product.estimatedDeliveryDays} days
                          </p>
                        </div>
                      </div>
                      {product.inventory && (
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-[#00AEEF]" />
                          <div>
                            <p className="text-white font-semibold">In Stock</p>
                            <p className="text-sm text-gray-400">{product.inventory} units available</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {product.type === "service" && (
                    <>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-[#00AEEF]" />
                        <div>
                          <p className="text-white font-semibold">Duration</p>
                          <p className="text-sm text-gray-400">{product.serviceDuration} minutes</p>
                        </div>
                      </div>
                      {product.turnaroundDays && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-[#00AEEF]" />
                          <div>
                            <p className="text-white font-semibold">Turnaround Time</p>
                            <p className="text-sm text-gray-400">{product.turnaroundDays} days</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-[#00AEEF]" />
                    <div>
                      <p className="text-white font-semibold">Refund Policy</p>
                      <p className="text-sm text-gray-400">
                        {product.refundPolicy === "no-refunds" && "No refunds"}
                        {product.refundPolicy === "7-day" && "7-day money-back guarantee"}
                        {product.refundPolicy === "30-day" && "30-day money-back guarantee"}
                        {product.refundPolicy === "custom" && "Custom refund policy"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="description" className="mb-8">
          <TabsList className="bg-[#1A1A1A] border-b border-gray-800">
            <TabsTrigger value="description" className="data-[state=active]:bg-gray-800">
              Description
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-gray-800">
              Details
            </TabsTrigger>
            {product.customerInstructions && (
              <TabsTrigger value="instructions" className="data-[state=active]:bg-gray-800">
                Instructions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardContent className="p-6">
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 whitespace-pre-wrap">{product.description}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Product Type</p>
                    <p className="text-white capitalize">{product.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Category</p>
                    <p className="text-white">{product.category}</p>
                  </div>
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
                  {product.contentRating && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Content Rating</p>
                      <Badge variant="secondary" className="bg-gray-800 text-white">
                        {product.contentRating}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {product.customerInstructions && (
            <TabsContent value="instructions" className="mt-6">
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="p-6">
                  <p className="text-gray-300 whitespace-pre-wrap">{product.customerInstructions}</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Checkout Dialog */}
        <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
          <DialogContent className="bg-[#1A1A1A] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Complete Your Purchase</DialogTitle>
              <DialogDescription className="text-gray-400">
                You'll be redirected to Stripe to complete your purchase securely
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Product</span>
                <span className="text-white font-semibold">{product.title}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Price</span>
                <span className="text-white font-semibold">${(currentPrice / 100).toFixed(2)}</span>
              </div>
              {product.type === "physical" && product.shippingCost > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Shipping</span>
                  <span className="text-white font-semibold">${(product.shippingCost / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-2xl font-bold text-[#00AEEF]">
                  ${((currentPrice + (product.shippingCost || 0)) / 100).toFixed(2)}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCheckoutDialogOpen(false)}
                className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createCheckout.mutate({ productId: product.id })}
                disabled={createCheckout.isPending}
                className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90"
              >
                {createCheckout.isPending ? "Processing..." : "Proceed to Checkout"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
