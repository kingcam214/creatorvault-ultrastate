import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowUpRight, ClipboardCheck, Link2, MessageSquare, Radar, RefreshCcw, ShieldCheck, Sparkles, Target, UserPlus } from "lucide-react";

type Platform = "twitter" | "x" | "instagram" | "tiktok" | "reddit" | "youtube" | "telegram" | "other";
type RecruiterStatus = "new" | "qualified" | "queued" | "contacted" | "replied" | "onboarding" | "onboarded" | "declined";

type CreatorRecord = {
  id: number;
  platform: Platform | string;
  handle: string;
  displayName?: string | null;
  profileUrl?: string | null;
  source?: string | null;
  bio?: string | null;
  niche?: string | null;
  followers: number;
  engagementRate: number;
  recentPost?: string | null;
  platforms?: string[] | null;
  monetizationScore: number;
  fitScore: number;
  urgencyScore: number;
  totalScore: number;
  auditPreview?: any;
  trailerConcept?: string | null;
  outreachMessage?: string | null;
  onboardingUrl?: string | null;
  telegramUsername?: string | null;
  telegramReady?: boolean | number | null;
  stripeLinkStatus?: string | null;
  status: RecruiterStatus | string;
  priority: string;
  updatedAt?: string | Date | null;
};

const statusOptions: RecruiterStatus[] = ["new", "qualified", "queued", "contacted", "replied", "onboarding", "onboarded", "declined"];
const platformOptions: Platform[] = ["instagram", "tiktok", "twitter", "youtube", "reddit", "telegram", "other"];

const defaultForm = {
  platform: "instagram" as Platform,
  handle: "",
  displayName: "",
  profileUrl: "",
  source: "manual-command-center",
  bio: "",
  niche: "",
  followers: "",
  engagementRate: "",
  recentPost: "",
  platforms: "instagram,tiktok",
  telegramUsername: "",
  stripeLinkStatus: "not_started",
};

function statNumber(value: unknown) {
  if (value === null || value === undefined) return "0";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString();
}

function scoreTone(score: number) {
  if (score >= 85) return "bg-emerald-600 text-white";
  if (score >= 70) return "bg-blue-600 text-white";
  if (score >= 45) return "bg-amber-500 text-black";
  return "bg-slate-500 text-white";
}

function priorityTone(priority: string) {
  if (priority === "critical") return "destructive" as const;
  if (priority === "high") return "default" as const;
  if (priority === "medium") return "secondary" as const;
  return "outline" as const;
}

function CreatorCard({ creator, onStatusChange, isUpdating }: { creator: CreatorRecord; onStatusChange: (creator: CreatorRecord, status: RecruiterStatus) => void; isUpdating: boolean }) {
  const audit = creator.auditPreview || {};
  const proofSignals = audit.proofSignals || {};

  return (
    <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{creator.displayName || `@${creator.handle}`}</CardTitle>
              <Badge variant="outline">{creator.platform}</Badge>
              <Badge variant={priorityTone(creator.priority)}>{creator.priority}</Badge>
              <Badge className={scoreTone(creator.totalScore)}>{creator.totalScore}/100</Badge>
            </div>
            <CardDescription>
              @{creator.handle} · {creator.niche || "general creator"} · {Number(creator.followers || 0).toLocaleString()} followers · {Number(creator.engagementRate || 0).toFixed(2)}% engagement
            </CardDescription>
          </div>
          <Select value={creator.status as RecruiterStatus} onValueChange={(value) => onStatusChange(creator, value as RecruiterStatus)} disabled={isUpdating}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Monetization</p>
            <p className="text-2xl font-bold">{creator.monetizationScore}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Brand Fit</p>
            <p className="text-2xl font-bold">{creator.fitScore}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Urgency</p>
            <p className="text-2xl font-bold">{creator.urgencyScore}</p>
          </div>
        </div>

        {audit.summary && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-950">Personalized audit preview</p>
            <p className="mt-1 text-sm text-blue-900">{audit.summary}</p>
            {audit.monetizationAngle && <p className="mt-2 text-sm text-blue-900">{audit.monetizationAngle}</p>}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Trailer concept</p>
            <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{creator.trailerConcept || "Trailer concept is generated when profile signal is available."}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Outreach message</p>
            <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{creator.outreachMessage || "Outreach copy is generated after ingestion."}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={proofSignals.onboardingUrlReady ? "default" : "outline"}><Link2 className="mr-1 h-3 w-3" /> Onboarding link {proofSignals.onboardingUrlReady ? "ready" : "pending"}</Badge>
          <Badge variant={creator.telegramReady ? "default" : "outline"}><MessageSquare className="mr-1 h-3 w-3" /> Telegram {creator.telegramReady ? "ready" : "missing"}</Badge>
          <Badge variant={["connected", "verified"].includes(String(creator.stripeLinkStatus)) ? "default" : "outline"}><ShieldCheck className="mr-1 h-3 w-3" /> Stripe {creator.stripeLinkStatus || "not_started"}</Badge>
          {creator.profileUrl && (
            <a className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-slate-700 hover:bg-slate-50" href={creator.profileUrl} target="_blank" rel="noreferrer">
              Profile <ArrowUpRight className="ml-1 h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecruiterOSCommandCenter() {
  const [form, setForm] = useState(defaultForm);
  const [statusFilter, setStatusFilter] = useState<RecruiterStatus | "all">("all");

  const dashboardQuery = trpc.recruiterOS.getDashboard.useQuery(undefined, { refetchInterval: 30000 });
  const queueQuery = trpc.recruiterOS.getQueue.useQuery({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50 });

  const ingestMutation = trpc.recruiterOS.ingestCreator.useMutation({
    onSuccess: async (record) => {
      const savedRecord = record as CreatorRecord;
      toast.success(`Recruiter OS scored @${savedRecord.handle} at ${savedRecord.totalScore}/100`);
      setForm(defaultForm);
      await Promise.all([dashboardQuery.refetch(), queueQuery.refetch()]);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateStatusMutation = trpc.recruiterOS.updateStatus.useMutation({
    onSuccess: async (data) => {
      const record = data.record as CreatorRecord | null | undefined;
      toast.success(record ? `Updated @${record.handle} to ${record.status}` : "Recruiter status updated");
      await Promise.all([dashboardQuery.refetch(), queueQuery.refetch()]);
    },
    onError: (error) => toast.error(error.message),
  });

  const dashboard = dashboardQuery.data as any;
  const summary = dashboard?.summary || {};
  const queue = (queueQuery.data || []) as CreatorRecord[];
  const topCreators = ((dashboard?.topCreators || []) as CreatorRecord[]).slice(0, 5);

  const stageCounts = useMemo(() => {
    return queue.reduce<Record<string, number>>((acc, creator) => {
      acc[creator.status] = (acc[creator.status] || 0) + 1;
      return acc;
    }, {});
  }, [queue]);

  function submitCreator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ingestMutation.mutate({
      platform: form.platform,
      handle: form.handle,
      displayName: form.displayName || undefined,
      profileUrl: form.profileUrl || undefined,
      source: form.source || "manual-command-center",
      bio: form.bio || undefined,
      niche: form.niche || undefined,
      followers: Number(form.followers || 0),
      engagementRate: Number(form.engagementRate || 0),
      recentPost: form.recentPost || undefined,
      platforms: form.platforms.split(",").map((item) => item.trim()).filter(Boolean),
      telegramUsername: form.telegramUsername || undefined,
      stripeLinkStatus: form.stripeLinkStatus as "not_started" | "pending" | "connected" | "verified" | "blocked",
    });
  }

  function updateField(field: keyof typeof defaultForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onStatusChange(creator: CreatorRecord, status: RecruiterStatus) {
    updateStatusMutation.mutate({ platform: creator.platform as Platform, handle: creator.handle, status });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-700">
              <Radar className="mr-1 h-3.5 w-3.5" /> CreatorVault Recruiter OS
            </Badge>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950">Acquisition Command Center</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Durable creator discovery, weighted acquisition scoring, personalized audit previews, trailer concepts, onboarding links, Telegram readiness, and Stripe linkage proof for the recruiter queue.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { dashboardQuery.refetch(); queueQuery.refetch(); }} disabled={dashboardQuery.isFetching || queueQuery.isFetching}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh live queue
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Profiles</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{statNumber(summary.total_profiles)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Qualified</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{statNumber(summary.qualified_profiles)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">High Priority</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{statNumber(summary.high_priority_profiles)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Score</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{statNumber(summary.average_score)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Telegram Ready</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{statNumber(summary.telegram_ready_profiles)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stripe Linked</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{statNumber(summary.stripe_linked_profiles)}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[560px]">
            <TabsTrigger value="queue"><Target className="mr-2 h-4 w-4" /> Recruiter Queue</TabsTrigger>
            <TabsTrigger value="ingest"><UserPlus className="mr-2 h-4 w-4" /> Add Creator</TabsTrigger>
            <TabsTrigger value="proof"><ClipboardCheck className="mr-2 h-4 w-4" /> Proof Signals</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Live recruiter queue</CardTitle>
                    <CardDescription>Sorted by weighted acquisition score from durable recruiter_creator_profiles records.</CardDescription>
                  </div>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RecruiterStatus | "all")}>
                    <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {statusOptions.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {queueQuery.isLoading ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Loading durable recruiter queue…</CardContent></Card>
            ) : queue.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No creator profiles match this filter yet. Add a creator to generate the first scored audit and onboarding proof record.</CardContent></Card>
            ) : (
              <div className="grid gap-5">
                {queue.map((creator) => (
                  <CreatorCard key={`${creator.platform}:${creator.handle}`} creator={creator} onStatusChange={onStatusChange} isUpdating={updateStatusMutation.isPending} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ingest">
            <Card>
              <CardHeader>
                <CardTitle>Add or refresh a creator profile</CardTitle>
                <CardDescription>The form writes a durable platform-handle record, recalculates weighted score, regenerates audit preview, and refreshes onboarding proof markers.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitCreator} className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-2"><Label>Platform</Label><Select value={form.platform} onValueChange={(value) => updateField("platform", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{platformOptions.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Handle</Label><Input value={form.handle} onChange={(e) => updateField("handle", e.target.value)} placeholder="creator_handle" required /></div>
                  <div className="space-y-2"><Label>Display name</Label><Input value={form.displayName} onChange={(e) => updateField("displayName", e.target.value)} placeholder="Creator name" /></div>
                  <div className="space-y-2"><Label>Profile URL</Label><Input value={form.profileUrl} onChange={(e) => updateField("profileUrl", e.target.value)} placeholder="https://…" /></div>
                  <div className="space-y-2"><Label>Niche</Label><Input value={form.niche} onChange={(e) => updateField("niche", e.target.value)} placeholder="fitness, dance, wellness, model…" /></div>
                  <div className="space-y-2"><Label>Source</Label><Input value={form.source} onChange={(e) => updateField("source", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Followers</Label><Input type="number" min="0" value={form.followers} onChange={(e) => updateField("followers", e.target.value)} placeholder="25000" /></div>
                  <div className="space-y-2"><Label>Engagement rate (%)</Label><Input type="number" min="0" step="0.01" value={form.engagementRate} onChange={(e) => updateField("engagementRate", e.target.value)} placeholder="4.8" /></div>
                  <div className="space-y-2"><Label>Platforms</Label><Input value={form.platforms} onChange={(e) => updateField("platforms", e.target.value)} placeholder="instagram,tiktok,youtube" /></div>
                  <div className="space-y-2"><Label>Telegram username</Label><Input value={form.telegramUsername} onChange={(e) => updateField("telegramUsername", e.target.value)} placeholder="creator_telegram" /></div>
                  <div className="space-y-2"><Label>Stripe link status</Label><Select value={form.stripeLinkStatus} onValueChange={(value) => updateField("stripeLinkStatus", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["not_started", "pending", "connected", "verified", "blocked"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2 lg:col-span-2"><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="Creator bio, offer signals, audience details…" rows={4} /></div>
                  <div className="space-y-2 lg:col-span-2"><Label>Recent post personalization hook</Label><Textarea value={form.recentPost} onChange={(e) => updateField("recentPost", e.target.value)} placeholder="Recent post, quote, launch, or audience pain point to personalize outreach…" rows={3} /></div>
                  <div className="lg:col-span-2"><Button type="submit" disabled={ingestMutation.isPending} className="w-full md:w-auto"><Sparkles className="mr-2 h-4 w-4" /> {ingestMutation.isPending ? "Scoring creator…" : "Score, audit, and queue creator"}</Button></div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proof" className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <Card>
              <CardHeader>
                <CardTitle>Stage proof</CardTitle>
                <CardDescription>Current queue distribution from durable Recruiter OS records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusOptions.map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium capitalize">{status}</span>
                    <Badge variant="secondary">{stageCounts[status] || 0}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top acquisition targets</CardTitle>
                <CardDescription>Production dashboard response proves score ordering, audit generation, and onboarding linkage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topCreators.length === 0 ? <p className="text-sm text-muted-foreground">No top creators available yet.</p> : topCreators.map((creator) => (
                  <div key={`top:${creator.platform}:${creator.handle}`} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{creator.displayName || `@${creator.handle}`}</p>
                        <p className="text-sm text-muted-foreground">{creator.platform} · {creator.niche || "general"}</p>
                      </div>
                      <Badge className={scoreTone(creator.totalScore)}>{creator.totalScore}/100</Badge>
                    </div>
                    <Separator className="my-3" />
                    <p className="text-sm text-muted-foreground">{creator.auditPreview?.summary || creator.trailerConcept || "Audit preview ready after ingestion."}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
