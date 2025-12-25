import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminTips() {
  const { data: tips, refetch } = trpc.vaultLive.getPendingTips.useQuery();

  const confirmTipMutation = trpc.vaultLive.confirmTip.useMutation({
    onSuccess: () => {
      toast.success("Tip confirmed!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConfirm = (tipId: number) => {
    confirmTipMutation.mutate({ tipId });
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Pending Tips - Admin Confirmation</CardTitle>
          <CardDescription>
            Confirm manual tips to update creator balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tips || tips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending tips
            </p>
          ) : (
            <div className="space-y-4">
              {tips.map((tip: any) => (
                <div
                  key={tip.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      ${tip.amount} tip
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Stream ID: {tip.streamId} | Tipper ID: {tip.userId}
                    </div>
                    <div className="text-sm">
                      Creator gets: <strong>${tip.creatorShare}</strong> (85%)
                    </div>
                    <Badge variant="secondary">{tip.status}</Badge>
                  </div>
                  <Button
                    onClick={() => handleConfirm(tip.id)}
                    disabled={confirmTipMutation.isPending}
                  >
                    Confirm Payment
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
