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
  const [action, setAction] = useState<"complete" | "reject" | "process" | null>(null);
  const [notes, setNotes] = useState("");
  const [transferProofId, setTransferProofId] = useState("");
  const [externalTransferId, setExternalTransferId] = useState("");

  const { data: payoutQueue, refetch } = trpc.payouts.getActionable.useQuery();
  const payouts = [...(payoutQueue?.processing || []), ...(payoutQueue?.pending || [])];

  const completeMutation = trpc.payouts.completeWithProof.useMutation({
    onSuccess: () => {
      toast.success("Payout completed with transfer proof");
      setSelectedPayout(null);
      setAction(null);
      setNotes("");
      setTransferProofId("");
      setExternalTransferId("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const processMutation = trpc.payouts.markProcessing.useMutation({
    onSuccess: () => {
      toast.success("Payout moved to instant processing lane");
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

    if (action === "complete") {
      if (!transferProofId.trim()) {
        toast.error("Transfer proof ID is required before marking an instant payout completed");
        return;
      }
      completeMutation.mutate({
        payoutId: selectedPayout.id,
        transferProofId,
        externalTransferId: externalTransferId || undefined,
        notes: notes || undefined,
      });
    } else if (action === "process") {
      processMutation.mutate({ payoutId: selectedPayout.id, notes: notes || undefined });
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
          Complete instant creator payouts with transfer proof, move pending requests into processing, or reject invalid requests
        </p>
      </div>

      {!payouts || payouts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No actionable payout requests
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {payouts.map((payout: any) => (
            <Card key={payout.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Payout Request #{payout.id} · {payout.status}</span>
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
                  {payout.status === "pending" && (
                    <Button
                      onClick={() => {
                        setSelectedPayout(payout);
                        setAction("process");
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Move to Instant Processing
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setSelectedPayout(payout);
                      setAction("complete");
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Complete With Proof
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
              {action === "complete" ? "Complete Payout With Proof" : action === "process" ? "Move to Instant Processing" : "Reject Payout"}
            </DialogTitle>
            <DialogDescription>
              {action === "complete"
                ? `Complete payout of ${selectedPayout ? formatCurrency(selectedPayout.amountInCents) : ""} to creator #${selectedPayout?.creatorId}? Transfer proof is required.`
                : action === "process"
                ? `Move payout of ${selectedPayout ? formatCurrency(selectedPayout.amountInCents) : ""} for creator #${selectedPayout?.creatorId} into the instant processing lane?`
                : `Reject payout of ${selectedPayout ? formatCurrency(selectedPayout.amountInCents) : ""} from creator #${selectedPayout?.creatorId}?`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              {action === "complete" && (
                <div className="space-y-3 mb-3">
                  <div>
                    <label className="text-sm font-medium">Transfer Proof ID *</label>
                    <Textarea value={transferProofId} onChange={(e) => setTransferProofId(e.target.value)} placeholder="Cash App/Zelle/TON/Wise/PayPal/Payoneer transfer reference, hash, or payment ID" rows={2} className="mt-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">External Transfer ID (optional)</label>
                    <Textarea value={externalTransferId} onChange={(e) => setExternalTransferId(e.target.value)} placeholder="Provider transaction ID if different from proof ID" rows={2} className="mt-2" />
                  </div>
                </div>
              )}
              <label className="text-sm font-medium">
                {action === "reject" ? "Reason for rejection *" : "Operator Notes (optional)"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === "reject" ? "Explain why this payout is being rejected..." : "Add settlement context, compliance note, or rail confirmation..."}
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
                setTransferProofId("");
                setExternalTransferId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={completeMutation.isPending || processMutation.isPending || rejectMutation.isPending}
              className={action === "complete" ? "bg-green-600 hover:bg-green-700" : action === "process" ? "bg-blue-600 hover:bg-blue-700" : ""}
              variant={action === "reject" ? "destructive" : "default"}
            >
              {completeMutation.isPending || processMutation.isPending || rejectMutation.isPending
                ? "Processing..."
                : action === "complete"
                ? "Complete With Proof"
                : action === "process"
                ? "Move to Processing"
                : "Reject Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
