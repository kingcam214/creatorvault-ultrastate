import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Search, Package } from "lucide-react";

export default function VaultMarket() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  // @ts-ignore
  const { data: products = [] } = trpc.vaultmarket.getAllProducts.useQuery({ limit: 50, offset: 0 });
  
  // @ts-ignore
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] from-blue-900 via-blue-800 to-cyan-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ShoppingBag className="h-12 w-12 text-blue-300" />
            <h1 className="text-5xl font-bold text-white">VaultMarket</h1>
          </div>
          <p className="text-xl text-blue-200">Digital products from creators</p>
          <div className="mt-8 max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-12 h-14 bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-white">No products found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  // @ts-ignore
            {filtered.map((p: any) => (
              <Card key={p.id} className="bg-white/10 border-white/20 p-6">
                <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                <p className="text-blue-200 mb-4 line-clamp-3">{p.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">
                    ${(p.priceAmount/100).toFixed(2)}
                  </span>
                  <Button 
                    onClick={() => setLocation(`/vaultmarket/product/${p.id}`)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
