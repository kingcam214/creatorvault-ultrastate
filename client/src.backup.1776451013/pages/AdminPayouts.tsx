/**
 * Admin Payouts Page
 * 
 * Approve/reject creator payout requests
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminPayouts() {
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: payouts, refetch } = trpc.payouts.getAllPending.useQuery();

  const approveMutation = trpc.payouts.approve.useMutation({
    onSuccess: () => {
      toast.success("Payout approved");
      setSelectedPayout(null);
      setAction(null);
      setNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.payouts.reject.useMutation({
    onSuccess: () => {
      toast.success("Payout rejected");
      setSelectedPayout(null);
      setAction(null);
      setNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConfirm = () => {
    if (!selectedPayout) return;

    if (action === "approve") {
      approveMutation.mutate({
        payoutId: selectedPayout.id,
        notes: notes || undefined,
      });
    } else if (action === "reject") {
      if (!notes.trim()) {
        toast.error("Please provide a reason for rejection");
        return;
      }
      rejectMutation.mutate({
        payoutId: selectedPayout.id,
        notes,
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Admin: Payout Requests</h1>
        <p className="text-muted-foreground mt-2">
          Approve or reject creator payout requests
        </p>
      </div>

      {!payouts || payouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending payout requests
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {payouts.map((payout: any) => (
            <Card key={payout.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Payout Request #{payout.id}</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(payout.amountInCents)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Creator ID</p>
                    <p className="font-medium">{payout.creatorId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p className="font-medium">{formatDate(payout.requestedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{payout.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{payout.status}</p>
                  </div>
                </div>

                {payout.paymentDetails && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Payment Details</p>
                    <div className="bg-muted p-3 rounded-md text-sm font-mono">
                      {payout.paymentDetails}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setSelectedPayout(payout);
                      setAction("approve");
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    ✓ Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedPayout(payout);
                      setAction("reject");
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    ✗ Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedPayout && !!action} onOpenChange={() => {
        setSelectedPayout(null);
        setAction(null);
        setNotes("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Payout" : "Reject Payout"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve" 
                ? `Approve payout of ${selectedPayout ? formatCurrency(selectedPayout.amountInCents) : ""} to creator #${selectedPayout?.creatorId}?`
                : `Reject payout of ${selectedPayout ? formatCurrency(selectedPayout.amountInCents) : ""} from creator #${selectedPayout?.creatorId}?`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {action === "approve" ? "Notes (optional)" : "Reason for rejection *"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === "approve" ? "Add any notes..." : "Explain why this payout is being rejected..."}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPayout(null);
                setAction(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={action === "reject" ? "destructive" : "default"}
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? "Processing..."
                : action === "approve"
                ? "Approve Payout"
                : "Reject Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
