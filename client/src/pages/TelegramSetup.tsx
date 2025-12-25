import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

export default function TelegramSetup() {
  const [webhookUrl, setWebhookUrl] = useState(window.location.origin);

  const { data: webhookInfo, refetch } = trpc.telegram.getWebhookInfo.useQuery();

  const setWebhookMutation = trpc.telegram.setWebhook.useMutation({
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Webhook configured successfully!");
        refetch();
      } else {
        toast.error("Failed to set webhook: " + result.description);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSetWebhook = () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }
    setWebhookMutation.mutate({ url: webhookUrl });
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Telegram Bot Setup</CardTitle>
          <CardDescription>
            Configure webhook to receive messages from your Telegram bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-domain.com"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Telegram will send messages to: {webhookUrl}/api/trpc/telegram.webhook
              </p>
            </div>
            <Button 
              onClick={handleSetWebhook}
              disabled={setWebhookMutation.isPending}
            >
              Set Webhook
            </Button>
          </div>

          {/* Current Status */}
          {webhookInfo && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Current Status</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {webhookInfo.result?.url ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm">
                    {webhookInfo.result?.url ? "Webhook Active" : "No Webhook Set"}
                  </span>
                </div>
                {webhookInfo.result?.url && (
                  <div className="text-sm text-muted-foreground">
                    URL: {webhookInfo.result.url}
                  </div>
                )}
                {webhookInfo.result?.pending_update_count !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    Pending updates: {webhookInfo.result.pending_update_count}
                  </div>
                )}
                {webhookInfo.result?.last_error_message && (
                  <div className="text-sm text-red-600">
                    Last error: {webhookInfo.result.last_error_message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bot Commands */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Available Bot Commands</h3>
            <div className="space-y-2 text-sm">
              <div><code>/start</code> - Welcome message with onboarding link</div>
              <div><code>/balance</code> - Check creator earnings</div>
              <div><code>/golive</code> - Quick link to start streaming</div>
              <div><code>/payout</code> - Request payout instructions</div>
            </div>
          </div>

          {/* Bot Info */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold">Bot Token</h3>
            <p className="text-sm text-muted-foreground">
              Token is configured in environment variables (TELEGRAM_BOT_TOKEN)
            </p>
            <p className="text-sm text-muted-foreground">
              Bot username: @YourBotUsername (check with @BotFather on Telegram)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
