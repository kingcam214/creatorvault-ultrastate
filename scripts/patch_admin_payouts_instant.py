from pathlib import Path
p = Path('/home/ubuntu/creatorvault-ultrastate-clean/client/src/pages/AdminPayouts.tsx')
s = p.read_text()

s = s.replace('  const [action, setAction] = useState<"approve" | "reject" | null>(null);\n  const [notes, setNotes] = useState("");\n', '  const [action, setAction] = useState<"complete" | "reject" | "process" | null>(null);\n  const [notes, setNotes] = useState("");\n  const [transferProofId, setTransferProofId] = useState("");\n  const [externalTransferId, setExternalTransferId] = useState("");\n')

s = s.replace('  const { data: payouts, refetch } = trpc.payouts.getAllPending.useQuery();\n\n  const approveMutation = trpc.payouts.approve.useMutation({\n', '  const { data: payoutQueue, refetch } = trpc.payouts.getActionable.useQuery();\n  const payouts = [...(payoutQueue?.processing || []), ...(payoutQueue?.pending || [])];\n\n  const completeMutation = trpc.payouts.completeWithProof.useMutation({\n')

s = s.replace('      toast.success("Payout approved");\n', '      toast.success("Payout completed with transfer proof");\n')
s = s.replace('      setAction(null);\n      setNotes("");\n      refetch();\n', '      setAction(null);\n      setNotes("");\n      setTransferProofId("");\n      setExternalTransferId("");\n      refetch();\n', 1)

s = s.replace('  const rejectMutation = trpc.payouts.reject.useMutation({\n', '  const processMutation = trpc.payouts.markProcessing.useMutation({\n    onSuccess: () => {\n      toast.success("Payout moved to instant processing lane");\n      setSelectedPayout(null);\n      setAction(null);\n      setNotes("");\n      refetch();\n    },\n    onError: (error) => {\n      toast.error(error.message);\n    },\n  });\n\n  const rejectMutation = trpc.payouts.reject.useMutation({\n')

old_handle = '''    if (action === "approve") {
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
'''
new_handle = '''    if (action === "complete") {
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
'''
if old_handle not in s:
    raise SystemExit('handle block not found')
s = s.replace(old_handle, new_handle)

s = s.replace('Approve or reject creator payout requests', 'Complete instant creator payouts with transfer proof, move pending requests into processing, or reject invalid requests')
s = s.replace('No pending payout requests', 'No actionable payout requests')
s = s.replace('                  <span>Payout Request #{payout.id}</span>', '                  <span>Payout Request #{payout.id} · {payout.status}</span>')

s = s.replace('''                  <Button
                    onClick={() => {
                      setSelectedPayout(payout);
                      setAction("approve");
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    ✓ Approve
                  </Button>
''', '''                  {payout.status === "pending" && (
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
''')

s = s.replace('''            <DialogTitle>
              {action === "approve" ? "Approve Payout" : "Reject Payout"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve" 
                ? `Approve payout of ${selectedPayout ? formatCurrency(selectedPayout.amountInCents) : ""} to creator #${selectedPayout?.creatorId}?`
                : `Reject payout of ${selectedPayout ? formatCurrency(selectedPayout.amountInCents) : ""} from creator #${selectedPayout?.creatorId}?`
              }
            </DialogDescription>
''', '''            <DialogTitle>
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
''')

s = s.replace('''              <label className="text-sm font-medium">
                {action === "approve" ? "Notes (optional)" : "Reason for rejection *"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === "approve" ? "Add any notes..." : "Explain why this payout is being rejected..."}
                rows={4}
                className="mt-2"
              />
''', '''              {action === "complete" && (
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
''')

s = s.replace('''                setNotes("");
''', '''                setNotes("");
                setTransferProofId("");
                setExternalTransferId("");
''', 1)

s = s.replace('''              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
''', '''              disabled={completeMutation.isPending || processMutation.isPending || rejectMutation.isPending}
              className={action === "complete" ? "bg-green-600 hover:bg-green-700" : action === "process" ? "bg-blue-600 hover:bg-blue-700" : ""}
''')

s = s.replace('''              {approveMutation.isPending || rejectMutation.isPending
                ? "Processing..."
                : action === "approve"
                ? "Approve Payout"
                : "Reject Payout"}
''', '''              {completeMutation.isPending || processMutation.isPending || rejectMutation.isPending
                ? "Processing..."
                : action === "complete"
                ? "Complete With Proof"
                : action === "process"
                ? "Move to Processing"
                : "Reject Payout"}
''')

s = s.replace('setAction(null);\n        setNotes("");\n        refetch();', 'setAction(null);\n        setNotes("");\n        setTransferProofId("");\n        setExternalTransferId("");\n        refetch();')
s = s.replace('setAction(null);\n        setNotes("");\n      },', 'setAction(null);\n        setNotes("");\n        setTransferProofId("");\n        setExternalTransferId("");\n      },')

p.write_text(s)
print('Patched AdminPayouts with instant processing lane and proof-required completion.')
