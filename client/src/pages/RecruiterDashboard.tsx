/**
 * Emma Network Recruiter Dashboard
 * Track commissions, recruited creators, and payouts
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RecruiterDashboard() {
  const { data: stats } = trpc.recruiterCommissions.getStats.useQuery();
  const { data: unpaid } = trpc.recruiterCommissions.getUnpaid.useQuery();
  
  const requestPayoutMutation = trpc.recruiterCommissions.requestPayout.useMutation({
    onSuccess: () => {
      toast.success("Payout requested");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Emma Network Recruiter Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your commissions and recruited creators
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${((stats?.totalEarned || 0) / 100).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unpaid Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${((stats?.unpaidBalance || 0) / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recruited Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.recruitedCreators || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2%</div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Unpaid Commissions</CardTitle>
          <CardDescription>Request payout when ready</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!unpaid || unpaid.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No unpaid commissions yet
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {unpaid.map((commission: any) => (
                  <div
                    key={commission.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">Creator ID: {commission.creatorId}</p>
                      <p className="text-sm text-muted-foreground">
                        Transaction ID: {commission.transactionId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ${(commission.commissionAmount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {commission.commissionRate}% commission
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button
                onClick={() => requestPayoutMutation.mutate()}
                disabled={requestPayoutMutation.isPending}
                className="w-full"
              >
                {requestPayoutMutation.isPending ? "Requesting..." : "Request Payout"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
