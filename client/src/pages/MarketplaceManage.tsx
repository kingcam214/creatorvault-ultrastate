import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Eye, BarChart3, DollarSign, Package, TrendingUp, Copy } from "lucide-react";

export default function MarketplaceManage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "active" | "archived">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: products, isLoading, refetch } = trpc.marketplace.getMyProducts.useQuery();
  const { data: stats } = trpc.marketplace.getSellerStats.useQuery();

  const deleteProduct = trpc.marketplace.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const duplicateProduct = trpc.marketplace.duplicateProduct.useMutation({
    onSuccess: () => {
      toast.success("Product duplicated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to duplicate product");
    },
  });

  const updateProductStatus = trpc.marketplace.updateProductStatus.useMutation({
    onSuccess: () => {
      toast.success("Product status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const filteredProducts = products?.filter((product: any) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white">
        <div className="container py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] bg-clip-text text-transparent">
              Seller Dashboard
            </h1>
            <p className="text-gray-400">Manage your products and track sales</p>
          </div>
          <Button
            onClick={() => navigate("/marketplace/create")}
            className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Product
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Products</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats?.totalProducts || 0}</p>
                </div>
                <Package className="w-12 h-12 text-[#00AEEF]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Sales</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats?.totalSales || 0}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-[#7B2CBF]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    ${((stats?.totalRevenue || 0) / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your cut (70%): ${(((stats?.totalRevenue || 0) * 0.7) / 100).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-[#00AEEF]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg. Product Price</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    ${((stats?.avgProductPrice || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="w-12 h-12 text-[#7B2CBF]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-48 bg-[#1A1A1A] border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-700 text-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Table */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Your Products</CardTitle>
            <CardDescription className="text-gray-400">
              {filteredProducts?.length || 0} products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducts && filteredProducts.length > 0 ? (
              <div className="space-y-4">
                {filteredProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 border border-gray-800 rounded-lg hover:border-gray-700"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      {product.mainImage ? (
                        <img
                          src={product.mainImage}
                          alt={product.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-600" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{product.title}</h3>
                        <Badge
                          variant="secondary"
                          className={
                            product.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : product.status === "draft"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/20 text-gray-400"
                          }
                        >
                          {product.status}
                        </Badge>
                        <Badge variant="secondary" className="bg-[#7B2CBF] text-white">
                          {product.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{product.shortDescription}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span>${(product.priceAmount / 100).toFixed(2)}</span>
                        <span>•</span>
                        <span>{product.salesCount || 0} sales</span>
                        <span>•</span>
                        <span>{product.viewCount || 0} views</span>
                        <span>•</span>
                        <span>${((product.totalRevenue || 0) / 100).toFixed(2)} revenue</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/marketplace/${product.id}`)}
                        className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/marketplace/analytics/${product.id}`)}
                        className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/marketplace/edit/${product.id}`)}
                        className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateProduct.mutate({ productId: product.id })}
                        className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setDeleteDialogOpen(true);
                        }}
                        className="bg-transparent border-red-700 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No products yet</h3>
                <p className="text-gray-400 mb-6">Create your first product to start selling</p>
                <Button
                  onClick={() => navigate("/marketplace/create")}
                  className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-[#1A1A1A] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete "{selectedProduct?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedProduct) {
                    deleteProduct.mutate({ productId: selectedProduct.id });
                  }
                }}
                disabled={deleteProduct.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteProduct.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
