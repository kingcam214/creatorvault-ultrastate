import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MarketplaceCreate() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Card className="bg-[#141414] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-[#f5f0e8]">
              Marketplace Product Creator
            </CardTitle>
            <CardDescription className="text-[#b8b8b8]">
              This page was temporarily simplified to resolve a production build parser error.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#d8d8d3]">
              You can still manage existing products from the marketplace dashboard while we finish the full form rebuild.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/marketplace/manage">
                <Button className="bg-[#c9a84c] text-[#0a0a0a] hover:opacity-90">
                  Go to Product Manager
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" className="border-[#3a3a3a] text-[#f5f0e8]">
                  Back to Marketplace
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
