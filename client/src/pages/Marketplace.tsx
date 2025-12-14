import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Marketplace() {
  const { data: products, isLoading } = trpc.marketplace.getProducts.useQuery();

  if (isLoading) {
    return <div className="container py-8">Loading marketplace...</div>;
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">CreatorVault Marketplace</h1>
        <p className="text-muted-foreground">
          Digital products, services, and courses from top creators
        </p>
      </div>

      {products && products.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to list a product on the marketplace
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product: any) => (
            <Card key={product.productId} className="p-6">
              <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
              <p className="text-muted-foreground mb-4">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  ${product.price} {product.currency}
                </span>
                <Button asChild>
                  <Link href={`/product/${product.productId}`}>View</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
