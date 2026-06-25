import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CreatorDashboard() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Product form state
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    type: "digital" as "digital" | "service" | "bundle" | "subscription",
    price: "",
    currency: "USD" as "USD" | "DOP" | "HTG",
    fulfillmentType: "manual" as "instant" | "manual" | "scheduled",
  });

  // Course form state
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
    isFree: false,
    currency: "USD" as "USD" | "DOP" | "HTG",
  });

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    title: "",
    description: "",
    tier: "mid" as "low" | "mid" | "high",
    price: "",
    currency: "USD" as "USD" | "DOP" | "HTG",
    deliveryDays: "7",
  });

  // Mutations
  const createProduct = trpc.marketplace.createProduct.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Product created successfully" });
      setProductForm({
        title: "",
        description: "",
        type: "digital",
        price: "",
        currency: "USD",
        fulfillmentType: "manual",
      });
      utils.marketplace.getProducts.invalidate();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createCourse = trpc.university.createCourse.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Course created successfully" });
      setCourseForm({
        title: "",
        description: "",
        price: "",
        isFree: false,
        currency: "USD",
      });
      utils.university.getCourses.invalidate();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createService = trpc.services.createOffer.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Service created successfully" });
      setServiceForm({
        title: "",
        description: "",
        tier: "mid",
        price: "",
        currency: "USD",
        deliveryDays: "7",
      });
      utils.services.getOffers.invalidate();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handlers
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(productForm.price);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Error", description: "Please enter a valid price", variant: "destructive" });
      return;
    }
    createProduct.mutate({
      ...productForm,
  // @ts-ignore
      price,
    });
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(courseForm.price);
    if (!courseForm.isFree && (isNaN(price) || price < 0)) {
      toast({ title: "Error", description: "Please enter a valid price", variant: "destructive" });
      return;
    }
    createCourse.mutate({
      ...courseForm,
      price: courseForm.isFree ? 0 : price,
    });
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(serviceForm.price);
    const deliveryDays = parseInt(serviceForm.deliveryDays);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Error", description: "Please enter a valid price", variant: "destructive" });
      return;
    }
    if (isNaN(deliveryDays) || deliveryDays <= 0) {
      toast({ title: "Error", description: "Please enter valid delivery days", variant: "destructive" });
      return;
    }
    createService.mutate({
      ...serviceForm,
      price,
      deliveryDays,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-black via-zinc-950 to-amber-950/20 p-5 text-white shadow-2xl sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-amber-300">Phone-first money loop</p>
            <h1 className="text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">Create the paid drop, price it, then send fans to buy.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Build the offer from your phone in three moves: name the asset, set the price, and choose how buyers receive it after checkout or verification.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["1. Package the offer", "2. Set price + currency", "3. Publish and verify access"].map((step) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-100">
                  {step}
                </div>
              ))}
            </div>
          </div>
          <img src="/images/platform/dashboard-ambient.webp" alt="Creator dashboard launch queue showing products, pricing, publish status, verification, and next actions" className="w-full rounded-[1.5rem] border border-white/10 object-cover" loading="eager" />
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl p-1">
          <TabsTrigger value="products" className="min-h-11 text-xs sm:text-sm">Products</TabsTrigger>
          <TabsTrigger value="courses" className="min-h-11 text-xs sm:text-sm">Courses</TabsTrigger>
          <TabsTrigger value="services" className="min-h-11 text-xs sm:text-sm">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Create a paid drop</CardTitle>
              <CardDescription>Package something a fan can understand, buy, and receive without needing you at a laptop.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <Label htmlFor="product-title">Title</Label>
                  <Input
                    id="product-title"
                    placeholder="Example: VIP teaser pack, custom menu, premium template"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea
                    id="product-description"
                    placeholder="Tell the buyer what they get, delivery timing, and what unlocks after payment."
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="product-type">Type</Label>
                    <Select
                      value={productForm.type}
                      onValueChange={(value: any) => setProductForm({ ...productForm, type: value })}
                    >
                      <SelectTrigger id="product-type">
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

                  <div>
                    <Label htmlFor="product-fulfillment">Fulfillment</Label>
                    <Select
                      value={productForm.fulfillmentType}
                      onValueChange={(value: any) => setProductForm({ ...productForm, fulfillmentType: value })}
                    >
                      <SelectTrigger id="product-fulfillment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instant</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="product-price">Price</Label>
                    <Input
                      id="product-price"
                      type="number"
                      inputMode="decimal"
                      placeholder="49.00"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="product-currency">Currency</Label>
                    <Select
                      value={productForm.currency}
                      onValueChange={(value: any) => setProductForm({ ...productForm, currency: value })}
                    >
                      <SelectTrigger id="product-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="DOP">DOP</SelectItem>
                        <SelectItem value="HTG">HTG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={createProduct.isPending} className="min-h-12 w-full text-base font-bold sm:w-auto">
                  {createProduct.isPending ? "Creating..." : "Create paid drop"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Create Course</CardTitle>
              <CardDescription>Add a new educational course to CreatorVault University</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <Label htmlFor="course-title">Title</Label>
                  <Input
                    id="course-title"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="course-description">Description</Label>
                  <Textarea
                    id="course-description"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="course-free"
                    checked={courseForm.isFree}
                    onChange={(e) => setCourseForm({ ...courseForm, isFree: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="course-free" className="cursor-pointer">
                    Free course
                  </Label>
                </div>

                {!courseForm.isFree && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="course-price">Price</Label>
                      <Input
                        id="course-price"
                        type="number"
                        inputMode="decimal"
                        placeholder="99.00"
                        step="0.01"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                        required={!courseForm.isFree}
                      />
                    </div>

                    <div>
                      <Label htmlFor="course-currency">Currency</Label>
                      <Select
                        value={courseForm.currency}
                        onValueChange={(value: any) => setCourseForm({ ...courseForm, currency: value })}
                      >
                        <SelectTrigger id="course-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="DOP">DOP</SelectItem>
                          <SelectItem value="HTG">HTG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={createCourse.isPending} className="min-h-12 w-full text-base font-bold sm:w-auto">
                  {createCourse.isPending ? "Creating..." : "Create course offer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Create Service</CardTitle>
              <CardDescription>Sell a deliverable with a clear price, scope, and delivery window.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateService} className="space-y-4">
                <div>
                  <Label htmlFor="service-title">Title</Label>
                  <Input
                    id="service-title"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="service-description">Description</Label>
                  <Textarea
                    id="service-description"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="service-tier">Tier</Label>
                  <Select
                    value={serviceForm.tier}
                    onValueChange={(value: any) => setServiceForm({ ...serviceForm, tier: value })}
                  >
                    <SelectTrigger id="service-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Ticket ($100-$500)</SelectItem>
                      <SelectItem value="mid">Mid Ticket ($500-$2,000)</SelectItem>
                      <SelectItem value="high">High Ticket ($2,000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="service-price">Price</Label>
                    <Input
                      id="service-price"
                      type="number"
                      inputMode="decimal"
                      placeholder="250.00"
                      step="0.01"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="service-currency">Currency</Label>
                    <Select
                      value={serviceForm.currency}
                      onValueChange={(value: any) => setServiceForm({ ...serviceForm, currency: value })}
                    >
                      <SelectTrigger id="service-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="DOP">DOP</SelectItem>
                        <SelectItem value="HTG">HTG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="service-delivery">Delivery (days)</Label>
                    <Input
                      id="service-delivery"
                      type="number"
                      inputMode="numeric"
                      placeholder="3"
                      value={serviceForm.deliveryDays}
                      onChange={(e) => setServiceForm({ ...serviceForm, deliveryDays: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={createService.isPending} className="min-h-12 w-full text-base font-bold sm:w-auto">
                  {createService.isPending ? "Creating..." : "Create service offer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
