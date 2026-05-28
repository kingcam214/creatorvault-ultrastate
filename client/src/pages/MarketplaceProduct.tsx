import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart, Package, TrendingUp, Shield, Download, Truck, Clock, Calendar, Eye } from "lucide-react";

const formatMoney = (cents: number | null | undefined) => `$${(((cents ?? 0) as number) / 100).toFixed(2)}`;

const refundCopy: Record<string, string> = {
  "no-refunds": "No refunds",
  "7-day": "7-day money-back guarantee",
  "30-day": "30-day money-back guarantee",
  custom: "Custom refund policy",
};

export default function MarketplaceProduct() {
  const [, params] = useRoute<{ productId: string }>("/marketplace/:productId");
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
      <div className="min-h-screen bg-[var(--bg-void)] text-white">
        <div className="container py-10">
          <div className="animate-fade-up rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-[var(--text-secondary)]">
            Loading marketplace asset...
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] text-white">
        <div className="container py-10">
          <p className="mb-4 font-['DM_Sans'] text-[var(--text-secondary)]">Product not found</p>
          <Button onClick={() => navigate("/marketplace")} variant="outline" className="border-[var(--border-subtle)] bg-transparent text-white hover:bg-[var(--bg-elevated)]">
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const images = [product.mainImage, ...(product.additionalImages || [])].filter(Boolean) as string[];
  const currentPrice = product.salePrice || product.priceAmount;
  const salesCount = product.salesCount ?? 0;
  const viewCount = product.viewCount ?? 0;
  const shippingCost = product.shippingCost ?? 0;
  const currentImage = images[selectedImage];
  const categoryLabel = [product.type, product.category].filter(Boolean).join(" · ");

  const featureTiles = [
    product.type === "digital"
      ? {
          icon: Download,
          label: "Instant Download",
          value: product.downloadLimit ? `${product.downloadLimit} downloads` : "Unlimited downloads",
          accent: "text-[var(--accent-cyan)]",
        }
      : null,
    product.type === "physical"
      ? {
          icon: Truck,
          label: "Shipping",
          value: `${formatMoney(shippingCost)} · Arrives in ${product.estimatedDeliveryDays ?? "standard"} days`,
          accent: "text-[var(--accent-cyan)]",
        }
      : null,
    product.type === "service"
      ? {
          icon: Clock,
          label: "Service Window",
          value: `${product.serviceDuration ?? "Custom"} minutes${product.turnaroundDays ? ` · ${product.turnaroundDays} day turnaround` : ""}`,
          accent: "text-[var(--accent-cyan)]",
        }
      : null,
    product.inventory
      ? {
          icon: Package,
          label: "Inventory",
          value: `${product.inventory} units available`,
          accent: "text-[var(--accent-cyan)]",
        }
      : null,
    product.accessDuration
      ? {
          icon: Calendar,
          label: "Access Duration",
          value: `${product.accessDuration} days`,
          accent: "text-[var(--accent-cyan)]",
        }
      : null,
    {
      icon: Shield,
      label: "Refund Policy",
      value: refundCopy[product.refundPolicy || ""] || "Policy displayed at checkout",
      accent: "text-[var(--text-muted)]",
    },
  ].filter(Boolean) as Array<{ icon: typeof Download; label: string; value: string; accent: string }>;

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--bg-void)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-[-12%] top-[8%] h-80 w-80 rounded-full bg-[var(--accent-cyan-dim)] blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-[var(--accent-gold-dim)] blur-3xl" />
      </div>

      <div className="container relative z-10 py-8 md:py-12">
        <Button
          variant="outline"
          onClick={() => navigate("/marketplace")}
          className="mb-6 border-[var(--border-subtle)] bg-[var(--bg-glass)] font-['DM_Sans'] text-white backdrop-blur-xl hover:border-[var(--border-accent)] hover:bg-[var(--bg-elevated)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="animate-fade-up">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-void)] shadow-2xl shadow-cyan-950/20">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.style.display = "none";
                    if (target.parentElement) {
                      target.parentElement.style.background = "linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%)";
                    }
                  }}
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-transparent via-transparent to-black/55">
                {!currentImage && (
                  <div className="max-w-sm px-8 text-center font-['Bebas_Neue'] text-4xl tracking-[0.08em] text-[var(--text-muted)]">
                    {product.title}
                  </div>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square overflow-hidden rounded-xl border bg-[var(--bg-surface)] transition hover:border-[var(--accent-cyan)] ${
                      selectedImage === idx ? "border-[var(--accent-cyan)] shadow-lg shadow-cyan-500/20" : "border-[var(--border-subtle)]"
                    }`}
                    aria-label={`View product image ${idx + 1}`}
                  >
                    <img src={img} alt={`${product.title} ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 font-['DM_Sans'] text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {categoryLabel}
              </Badge>
              {(product.salePrice || salesCount === 0) && (
                <Badge className="rounded-full border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-3 py-1 font-['Space_Mono'] text-[10px] uppercase tracking-[0.12em] text-[var(--accent-cyan)]">
                  {product.salePrice ? "Live Offer" : "New Launch"}
                </Badge>
              )}
            </div>

            <h1 className="mb-3 font-['Bebas_Neue'] text-5xl leading-none tracking-[0.04em] text-white md:text-6xl">{product.title}</h1>
            <p className="mb-5 font-['DM_Sans'] text-[15px] leading-7 text-[var(--text-secondary)]">{product.shortDescription}</p>

            <div className="mb-6 flex flex-wrap items-center gap-3 font-['Space_Mono'] text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--accent-cyan)]" />↑ {salesCount} sales
              </span>
              <span className="text-[var(--border-subtle)]">·</span>
              <span className="live-stat inline-flex items-center gap-2">
                <Eye className="h-4 w-4 text-[var(--text-muted)]" />{viewCount} views
              </span>
            </div>

            <Card className="mb-6 overflow-hidden border-[var(--border-accent)] bg-[var(--bg-glass)] shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-1 font-['Space_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Secure price</p>
                    <div className="font-['Bebas_Neue'] text-5xl leading-none tracking-[0.04em] text-[var(--accent-cyan)]">
                      {formatMoney(currentPrice)}
                    </div>
                    {product.salePrice && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-['Space_Mono'] text-sm text-[var(--text-muted)] line-through">{formatMoney(product.priceAmount)}</span>
                        <Badge className="bg-[var(--accent-gold-dim)] font-['Space_Mono'] text-[var(--accent-gold)]">
                          Save {formatMoney((product.priceAmount ?? 0) - product.salePrice)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => setCheckoutDialogOpen(true)}
                  className="cta-pulse h-[52px] w-full bg-[var(--accent-cyan)] font-['Bebas_Neue'] text-lg tracking-[0.1em] text-[var(--bg-void)] hover:bg-cyan-300"
                >
                  <ShoppingCart className="mr-3 h-5 w-5" />
                  Buy Now
                </Button>

                {product.monthlyPrice && (
                  <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                    <p className="font-['DM_Sans'] text-sm text-[var(--text-muted)]">Or pay monthly</p>
                    <p className="font-['Space_Mono'] text-xl font-semibold text-white">{formatMoney(product.monthlyPrice)}/month</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {featureTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <div key={tile.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                    <Icon className={`mb-3 h-5 w-5 ${tile.accent}`} />
                    <p className="font-['DM_Sans'] text-[13px] font-semibold text-white">{tile.label}</p>
                    <p className="mt-1 font-['DM_Sans'] text-xs leading-5 text-[var(--text-muted)]">{tile.value}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <Tabs defaultValue="description" className="mt-10">
          <TabsList className="h-12 border-b border-[var(--border-subtle)] bg-transparent p-0">
            <TabsTrigger value="description" className="h-12 rounded-none border-b-2 border-transparent bg-transparent px-5 font-['DM_Sans'] text-[var(--text-muted)] data-[state=active]:border-[var(--accent-cyan)] data-[state=active]:bg-transparent data-[state=active]:text-white">
              Description
            </TabsTrigger>
            <TabsTrigger value="details" className="h-12 rounded-none border-b-2 border-transparent bg-transparent px-5 font-['DM_Sans'] text-[var(--text-muted)] data-[state=active]:border-[var(--accent-cyan)] data-[state=active]:bg-transparent data-[state=active]:text-white">
              Details
            </TabsTrigger>
            {product.customerInstructions && (
              <TabsTrigger value="instructions" className="h-12 rounded-none border-b-2 border-transparent bg-transparent px-5 font-['DM_Sans'] text-[var(--text-muted)] data-[state=active]:border-[var(--accent-cyan)] data-[state=active]:bg-transparent data-[state=active]:text-white">
                Instructions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardContent className="p-6">
                <p className="whitespace-pre-wrap font-['DM_Sans'] text-[15px] leading-7 text-[var(--text-secondary)]">{product.description}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                <div>
                  <p className="mb-1 font-['Space_Mono'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Product Type</p>
                  <p className="font-['DM_Sans'] text-white capitalize">{product.type}</p>
                </div>
                <div>
                  <p className="mb-1 font-['Space_Mono'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Category</p>
                  <p className="font-['DM_Sans'] text-white">{product.category}</p>
                </div>
                {product.keywords && product.keywords.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="mb-2 font-['Space_Mono'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {product.keywords.map((keyword: string) => (
                        <Badge key={keyword} className="border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] font-['DM_Sans'] text-[var(--accent-cyan)]">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {product.contentRating && (
                  <div>
                    <p className="mb-1 font-['Space_Mono'] text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Content Rating</p>
                    <Badge className="bg-[var(--bg-elevated)] font-['DM_Sans'] text-white">{product.contentRating}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {product.customerInstructions && (
            <TabsContent value="instructions" className="mt-6">
              <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <CardContent className="p-6">
                  <p className="whitespace-pre-wrap font-['DM_Sans'] text-[15px] leading-7 text-[var(--text-secondary)]">{product.customerInstructions}</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
          <DialogContent className="border-[var(--border-subtle)] bg-[var(--bg-surface)] text-white">
            <DialogHeader>
              <DialogTitle className="font-['Bebas_Neue'] text-3xl tracking-[0.08em]">Complete Your Purchase</DialogTitle>
              <DialogDescription className="font-['DM_Sans'] text-[var(--text-secondary)]">
                You'll be redirected to Stripe to complete your purchase securely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 font-['DM_Sans']">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Product</span>
                <span className="text-right font-semibold text-white">{product.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Price</span>
                <span className="font-['Space_Mono'] font-semibold text-white">{formatMoney(currentPrice)}</span>
              </div>
              {product.type === "physical" && shippingCost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Shipping</span>
                  <span className="font-['Space_Mono'] font-semibold text-white">{formatMoney(shippingCost)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
                <span className="font-bold text-white">Total</span>
                <span className="font-['Bebas_Neue'] text-3xl tracking-[0.04em] text-[var(--accent-cyan)]">{formatMoney(currentPrice + shippingCost)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)} className="border-[var(--border-subtle)] bg-transparent text-white hover:bg-[var(--bg-elevated)]">
                Cancel
              </Button>
              <Button
                onClick={() => createCheckout.mutate({ productId: product.id })}
                disabled={createCheckout.isPending}
                className="bg-[var(--accent-cyan)] font-['Bebas_Neue'] tracking-[0.08em] text-[var(--bg-void)] hover:bg-cyan-300"
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
