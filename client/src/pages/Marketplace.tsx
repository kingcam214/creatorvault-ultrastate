import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function Marketplace() {
  const { data: products, isLoading } = trpc.marketplace.getProducts.useQuery();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  
  const createManualOrder = trpc.manualPayment.createManualPaymentOrder.useMutation({
    onSuccess: (data: any) => {
      toast.success("Order created! Check your email for payment instructions.");
      setSelectedProduct(null);
      setSelectedPaymentMethod("");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handlePayment = (product: any, method: "cashapp" | "zelle" | "applepay" | "manual_invoice") => {
    setSelectedPaymentMethod(method);
    createManualOrder.mutate({
      productId: product.productId,
      productType: "marketplace" as const,
      amount: product.price,
      paymentMethod: method,
    });
  };

  if (isLoading) {
    return <div className="container py-8">Loading marketplace...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">CreatorVault Marketplace</h1>
          <p className="text-gray-300">
            Digital products, services, and courses from top creators
          </p>
        </div>

        {products && products.length === 0 ? (
          <Card className="p-12 text-center bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <h3 className="text-xl font-semibold mb-2">No products yet</h3>
            <p className="text-gray-300 mb-4">
              Be the first to list a product on the marketplace
            </p>
            <Button className="bg-purple-600 hover:bg-purple-700">
              List a Product
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product: any) => (
              <Card key={product.productId} className="bg-white/10 backdrop-blur-lg border-white/20 text-white flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{product.title}</CardTitle>
                    <Badge variant="secondary" className="bg-purple-600 text-white">
                      {product.category || "Digital"}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-300">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2">
                    {product.features && product.features.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                        {product.features.slice(0, 3).map((feature: string, idx: number) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                    ${product.price}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                        onClick={() => setSelectedProduct(product)}
                      >
                        Buy Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 text-white border-purple-500">
                      <DialogHeader>
                        <DialogTitle>Choose Payment Method</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Select how you'd like to pay for {selectedProduct?.title}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-4">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handlePayment(selectedProduct, "cashapp")}
                          disabled={createManualOrder.isPending}
                        >
                          💵 Pay with CashApp
                        </Button>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handlePayment(selectedProduct, "zelle")}
                          disabled={createManualOrder.isPending}
                        >
                          💳 Pay with Zelle
                        </Button>
                        <Button
                          className="w-full bg-gray-700 hover:bg-gray-800 text-white"
                          onClick={() => handlePayment(selectedProduct, "applepay")}
                          disabled={createManualOrder.isPending}
                        >
                          🍎 Pay with Apple Pay
                        </Button>
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handlePayment(selectedProduct, "manual_invoice")}
                          disabled={createManualOrder.isPending}
                        >
                          📧 Request Invoice
                        </Button>
                      </div>
                      <DialogFooter>
                        <p className="text-xs text-gray-400 text-center w-full">
                          You'll receive payment instructions via email after selecting a method
                        </p>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
