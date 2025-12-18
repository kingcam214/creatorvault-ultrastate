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
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Creator Dashboard</h1>
        <p className="text-muted-foreground">Create and manage your products, courses, and services</p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Create Product</CardTitle>
              <CardDescription>Add a new digital product, service, bundle, or subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <Label htmlFor="product-title">Title</Label>
                  <Input
                    id="product-title"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea
                    id="product-description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product-price">Price</Label>
                    <Input
                      id="product-price"
                      type="number"
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

                <Button type="submit" disabled={createProduct.isPending}>
                  {createProduct.isPending ? "Creating..." : "Create Product"}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="course-price">Price</Label>
                      <Input
                        id="course-price"
                        type="number"
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

                <Button type="submit" disabled={createCourse.isPending}>
                  {createCourse.isPending ? "Creating..." : "Create Course"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Create Service</CardTitle>
              <CardDescription>Offer a professional service to clients</CardDescription>
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="service-price">Price</Label>
                    <Input
                      id="service-price"
                      type="number"
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
                      value={serviceForm.deliveryDays}
                      onChange={(e) => setServiceForm({ ...serviceForm, deliveryDays: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={createService.isPending}>
                  {createService.isPending ? "Creating..." : "Create Service"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
