import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Filter, Package, TrendingUp, Star } from "lucide-react";

const CATEGORIES = [
  "All Categories",
  "Courses & Education",
  "Ebooks & Guides",
  "Presets & Templates",
  "Audio & Music",
  "Software & Apps",
  "Digital Art",
  "Merchandise",
  "Beauty & Skincare",
  "Fitness Gear",
  "Handmade Goods",
  "Coaching & Consulting",
  "Content Creation",
  "Shoutouts & Promotions",
  "Meet & Greets",
  "Other"
];

export default function Marketplace() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "price-low" | "price-high">("newest");

  const { data: products, isLoading } = trpc.marketplace.getProducts.useQuery();

  const filteredProducts = products
    ?.filter((product: any) => {
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "All Categories" || product.category === categoryFilter;
      return matchesSearch && matchesCategory && product.status === "active";
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "popular":
          return (b.salesCount || 0) - (a.salesCount || 0);
        case "price-low":
          return a.priceAmount - b.priceAmount;
        case "price-high":
          return b.priceAmount - a.priceAmount;
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white">
        <div className="container py-8">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] bg-clip-text text-transparent">
            CreatorVault Marketplace
          </h1>
          <p className="text-gray-400">
            Digital products, physical goods, and services from top creators
          </p>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-700 text-white">
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            {filteredProducts?.length || 0} products found
          </p>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-48 bg-[#1A1A1A] border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-700 text-white">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any) => (
              <Card
                key={product.id}
                className="bg-[#1A1A1A] border-gray-800 hover:border-[#00AEEF] transition-all cursor-pointer group"
                onClick={() => navigate(`/marketplace/${product.id}`)}
              >
                <CardHeader className="p-0">
                  <div className="aspect-square bg-gray-800 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {product.mainImage ? (
                      <img
                        src={product.mainImage}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-gray-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg text-white line-clamp-1">{product.title}</CardTitle>
                    <Badge variant="secondary" className="bg-[#7B2CBF] text-white text-xs">
                      {product.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {product.shortDescription || product.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    {product.salesCount > 0 && (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        <span>{product.salesCount} sales</span>
                      </>
                    )}
                    {product.salesCount === 0 && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-[#00AEEF]">
                      ${((product.salePrice || product.priceAmount) / 100).toFixed(2)}
                    </div>
                    {product.salePrice && (
                      <div className="text-sm text-gray-400 line-through">
                        ${(product.priceAmount / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/marketplace/${product.id}`);
                    }}
                  >
                    View
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-[#1A1A1A] border-gray-800 p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery || categoryFilter !== "All Categories" ? "No products found" : "No products yet"}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || categoryFilter !== "All Categories"
                ? "Try adjusting your search or filters"
                : "Be the first to list a product on the marketplace"}
            </p>
            {!searchQuery && categoryFilter === "All Categories" && (
              <Button
                onClick={() => navigate("/marketplace/create")}
                className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90"
              >
                List a Product
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
