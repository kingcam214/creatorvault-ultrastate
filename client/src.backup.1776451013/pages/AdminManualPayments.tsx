/**
 * Admin Manual Payments Page
 * 
 * Confirm manual payments (CashApp, Zelle, etc.) from fans
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminManualPayments() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: pendingPayments, refetch } = trpc.manualPayment.getPendingPayments.useQuery();
  const { data: summary } = trpc.manualPayment.getRevenueSummary.useQuery();

  const confirmMutation = trpc.manualPayment.confirmManualPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment confirmed");
      setSelectedOrder(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConfirm = () => {
    if (!selectedOrder) return;
    confirmMutation.mutate({ orderId: selectedOrder.orderId });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Admin: Manual Payments</h1>
        <p className="text-muted-foreground mt-2">
          Confirm CashApp, Zelle, Apple Pay, and manual invoice payments
        </p>
      </div>

      {/* Revenue Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {summary.orderCount} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Paid Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(summary.paidRevenue)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {summary.paidOrderCount} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {formatCurrency(summary.pendingRevenue)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {summary.pendingOrderCount} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Creator Share (70%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(summary.commissions.creatorAmount)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                From paid orders
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Payments */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pending Payments</h2>
        
        {!pendingPayments || pendingPayments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending payments
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingPayments.map((payment: any) => (
              <Card key={payment.orderId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Order #{payment.orderId.slice(0, 8)}</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(payment.amount)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">User ID</p>
                      <p className="font-medium">{payment.userId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">{payment.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium text-yellow-600">Pending Confirmation</p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-bold mb-2 text-sm">Commission Split:</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Creator (70%)</p>
                        <p className="font-bold text-green-600">
                          {formatCurrency(payment.commissions.creatorAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recruiter (20%)</p>
                        <p className="font-bold text-blue-600">
                          {formatCurrency(payment.commissions.recruiterAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Platform (10%)</p>
                        <p className="font-bold text-purple-600">
                          {formatCurrency(payment.commissions.platformAmount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setSelectedOrder(payment)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    ✓ Confirm Payment Received
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Confirm that you received {selectedOrder ? formatCurrency(selectedOrder.amount) : ""} via {selectedOrder?.paymentMethod}?
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Order Details:</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Order ID:</strong> {selectedOrder.orderId}</p>
                  <p><strong>User ID:</strong> {selectedOrder.userId}</p>
                  <p><strong>Amount:</strong> {formatCurrency(selectedOrder.amount)}</p>
                  <p><strong>Method:</strong> {selectedOrder.paymentMethod}</p>
                </div>
              </div>

              <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-600">
                <p className="text-sm text-yellow-200">
                  ⚠️ <strong>Important:</strong> Only confirm after verifying payment in your {selectedOrder.paymentMethod} account.
                  This action will update balances and cannot be undone.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedOrder(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmMutation.isPending ? "Confirming..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
