import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Services() {
  const { data: offers, isLoading } = trpc.services.getOffers.useQuery();

  if (isLoading) {
    return <div className="container py-8">Loading services...</div>;
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Creator Services</h1>
        <p className="text-muted-foreground">
          High-ticket mentorship, coaching, and done-for-you services
        </p>
      </div>

      {offers && offers.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-4">
            Check back soon for new service offerings
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers?.map((offer: any) => (
            <Card key={offer.offerId} className="p-6">
              <div className="mb-2">
                <span className="text-xs font-semibold uppercase text-primary">
                  {offer.tier}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{offer.title}</h3>
              <p className="text-muted-foreground mb-4">{offer.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  ${offer.price} {offer.currency}
                </span>
                <Button asChild>
                  <Link href={`/service/${offer.offerId}`}>Book Now</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
