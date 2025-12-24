/**
 * Social Media Audit
 * 
 * Instant creator onboarding with monetization insights
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SocialMediaAudit() {
  const [profiles, setProfiles] = useState<Array<{ platform: string; username: string }>>([
    { platform: "", username: "" },
  ]);
  const [auditResult, setAuditResult] = useState<any>(null);

  const { data: myAudits } = trpc.socialMediaAudit.getMyAudits.useQuery();

  const runAuditMutation = trpc.socialMediaAudit.runAudit.useMutation({
    onSuccess: (result) => {
      toast.success("Audit complete!");
      setAuditResult(result);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addProfile = () => {
    if (profiles.length >= 4) {
      toast.error("Maximum 4 social profiles");
      return;
    }
    setProfiles([...profiles, { platform: "", username: "" }]);
  };

  const removeProfile = (index: number) => {
    setProfiles(profiles.filter((_, i) => i !== index));
  };

  const updateProfile = (index: number, field: "platform" | "username", value: string) => {
    const updated = [...profiles];
    updated[index][field] = value;
    setProfiles(updated);
  };

  const handleRunAudit = () => {
    const validProfiles = profiles.filter((p) => p.platform && p.username);
    
    if (validProfiles.length === 0) {
      toast.error("Please add at least one social profile");
      return;
    }

    runAuditMutation.mutate({
      profiles: validProfiles.map((p) => ({
        platform: p.platform as any,
        username: p.username,
      })),
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Social Media Audit</h1>
        <p className="text-muted-foreground mt-2">
          Get instant insights on your monetization potential
        </p>
      </div>

      {!auditResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Social Profiles</CardTitle>
            <CardDescription>
              We'll analyze your accounts and show you exactly how much money you're leaving on the table
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {profiles.map((profile, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Platform</Label>
                  <Select
                    value={profile.platform}
                    onValueChange={(value) => updateProfile(index, "platform", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Label>Username</Label>
                  <Input
                    value={profile.username}
                    onChange={(e) => updateProfile(index, "username", e.target.value)}
                    placeholder="@username"
                  />
                </div>

                {profiles.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => removeProfile(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}

            {profiles.length < 4 && (
              <Button variant="outline" onClick={addProfile} className="w-full">
                + Add Another Profile
              </Button>
            )}

            <Button
              onClick={handleRunAudit}
              disabled={runAuditMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {runAuditMutation.isPending ? "Analyzing..." : "Run Free Audit"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Monetization Potential */}
          <Card className="border-2 border-green-600">
            <CardHeader>
              <CardTitle className="text-center">Your Monetization Potential</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-6xl font-bold text-green-600 mb-2">
                  {formatCurrency(auditResult.currentMonetizationPotential)}/mo
                </div>
                <p className="text-muted-foreground">
                  Based on your current following and engagement
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle>Your Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {auditResult.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Revenue Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {auditResult.revenueOpportunities.map((opportunity: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-600">💰</span>
                    <span>{opportunity}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 30-Day Roadmap */}
          <Card>
            <CardHeader>
              <CardTitle>Your 30-Day Roadmap to $1,000/month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Week 1:</h3>
                <ul className="space-y-1 text-sm">
                  {auditResult.roadmap.week1.map((task: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">Week 2:</h3>
                <ul className="space-y-1 text-sm">
                  {auditResult.roadmap.week2.map((task: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">Week 3:</h3>
                <ul className="space-y-1 text-sm">
                  {auditResult.roadmap.week3.map((task: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-2">Week 4:</h3>
                <ul className="space-y-1 text-sm">
                  {auditResult.roadmap.week4.map((task: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* First $1K Plan */}
          <Card className="border-2 border-purple-600">
            <CardHeader>
              <CardTitle>Your Path to First $1,000</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{auditResult.firstThousandPlan}</p>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setAuditResult(null);
                setProfiles([{ platform: "", username: "" }]);
              }}
              className="flex-1"
            >
              Run Another Audit
            </Button>
            <Button
              onClick={() => (window.location.href = "/creator-subscriptions")}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Start Monetizing →
            </Button>
          </div>
        </div>
      )}

      {/* Previous Audits */}
      {myAudits && myAudits.length > 0 && !auditResult && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Previous Audits</h2>
          <div className="grid gap-4">
            {myAudits.map((audit: any) => (
              <Card key={audit.auditId} className="cursor-pointer hover:border-purple-600" onClick={() => setAuditResult(audit)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Audit from {new Date(audit.createdAt).toLocaleDateString()}</span>
                    <span className="text-green-600">{formatCurrency(audit.currentMonetizationPotential)}/mo</span>
                  </CardTitle>
                  <CardDescription>
                    {audit.profiles.length} social profiles analyzed
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
