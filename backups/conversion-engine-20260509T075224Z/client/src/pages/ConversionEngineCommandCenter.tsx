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
import { ArrowUpRight, Banknote, Bot, CheckCircle2, Clapperboard, Crown, DollarSign, MessageSquare, PackageCheck, Radar, RefreshCcw, ShieldCheck, Sparkles, Target, UserCheck, Zap } from "lucide-react";

type PriorityRow = {
  profile_id: number;
  platform: string;
  handle: string;
  display_name?: string | null;
  followers: number;
  engagement_rate: string | number;
  total_score: number;
  recruiter_priority: string;
  niche_classification: string;
  estimated_lost_revenue_cents: number;
  recurring_revenue_potential_cents: number;
  conversion_probability_score: number;
  personalized_social_audit: string;
  personalized_trailer_brief: string;
  assigned_recruiter?: string | null;
  onboarding_stage: string;
  telegram_transition_status: string;
  stripe_activation_status: string;
  money_next_action: string;
  priority_score: number;
  priority_band: string;
  ranking_reason: string;
  next_money_action: string;
};

type PackageRow = {
  id: number;
  packageKey: string;
  packageName: string;
  description: string;
  existingSystems: string[];
  priceFloorCents: number;
  recurringPotentialCents: number;
  moneyTrigger: string;
  activationRoute: string;
  isActive: boolean;
};

const onboardingStages = ["packet_generated", "audit_reviewed", "trailer_preview_sent", "telegram_invited", "telegram_joined", "stripe_pending", "stripe_connected", "vault_setup", "subscription_live", "vip_offer_live", "converted"] as const;
const conversionStages = ["queued", "nurturing", "interested", "onboarding", "activation", "monetized", "retained", "lost"] as const;
const telegramStages = ["not_started", "invite_ready", "invite_sent", "joined", "funnel_enrolled"] as const;
const stripeStages = ["not_started", "pending", "connected", "verified", "blocked"] as const;

function money(cents: unknown): string {
  const numeric = Number(cents || 0);
  return `$${Math.round(numeric / 100).toLocaleString()}`;
}

function numberValue(value: unknown): string {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return "0";
  return numeric.toLocaleString();
}

function percentValue(value: unknown): string {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return "0.00%";
  return `${numeric.toFixed(2)}%`;
}

function bandTone(band: string) {
  if (band === "critical") return "destructive" as const;
  if (band === "high") return "default" as const;
  if (band === "medium") return "secondary" as const;
  return "outline" as const;
}

function scoreClass(score: unknown): string {
  const value = Number(score || 0);
  if (value >= 85) return "bg-emerald-600 text-white";
  if (value >= 70) return "bg-blue-600 text-white";
  if (value >= 45) return "bg-amber-500 text-black";
  return "bg-slate-600 text-white";
}

function packageKeyLabel(key: string): string {
  return key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function PriorityCard({ row, onSelect }: { row: PriorityRow; onSelect: (row: PriorityRow) => void }) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{row.display_name || `@${row.handle}`}</CardTitle>
              <Badge variant="outline">{row.platform}</Badge>
              <Badge variant={bandTone(row.priority_band)}>{row.priority_band}</Badge>
              <Badge className={scoreClass(row.priority_score)}>{row.priority_score}/100 priority</Badge>
            </div>
            <CardDescription>
              @{row.handle} · {row.niche_classification} · {numberValue(row.followers)} followers · {percentValue(row.engagement_rate)} engagement
            </CardDescription>
          </div>
          <Button onClick={() => onSelect(row)}>
            <Target className="mr-2 h-4 w-4" /> Open packet
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold uppercase text-emerald-700">Leak estimate</p><p className="text-2xl font-bold text-emerald-950">{money(row.estimated_lost_revenue_cents)}</p></div>
          <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs font-semibold uppercase text-blue-700">Recurring potential</p><p className="text-2xl font-bold text-blue-950">{money(row.recurring_revenue_potential_cents)}</p></div>
          <div className="rounded-xl bg-violet-50 p-3"><p className="text-xs font-semibold uppercase text-violet-700">Conversion</p><p className="text-2xl font-bold text-violet-950">{row.conversion_probability_score}/100</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-600">Recruiter OS</p><p className="text-2xl font-bold text-slate-950">{row.total_score}/100</p></div>
        </div>
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{row.ranking_reason}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline"><UserCheck className="mr-1 h-3 w-3" /> {row.assigned_recruiter || "Revenue desk"}</Badge>
          <Badge variant="outline"><MessageSquare className="mr-1 h-3 w-3" /> Telegram {row.telegram_transition_status}</Badge>
          <Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" /> Stripe {row.stripe_activation_status}</Badge>
          <Badge variant="outline"><Zap className="mr-1 h-3 w-3" /> {row.onboarding_stage}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function PackageShelf({ packages }: { packages: PackageRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {packages.map((pkg) => (
        <Card key={pkg.id} className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> {pkg.packageName}</CardTitle>
                <CardDescription>{packageKeyLabel(pkg.packageKey)}</CardDescription>
              </div>
              <Badge variant="outline">{money(pkg.priceFloorCents)} floor</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-700">{pkg.description}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold uppercase text-emerald-700">Recurring potential</p><p className="text-xl font-bold text-emerald-950">{money(pkg.recurringPotentialCents)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-600">Activation route</p><p className="text-sm font-semibold text-slate-950">{pkg.activationRoute}</p></div>
            </div>
            <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">{pkg.moneyTrigger}</p>
            <div className="flex flex-wrap gap-2">
              {pkg.existingSystems.map((system) => <Badge key={system} variant="secondary">{system}</Badge>)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ConversionEngineCommandCenter() {
  const [selected, setSelected] = useState<PriorityRow | null>(null);
  const [profileId, setProfileId] = useState("");
  const [assignedRecruiter, setAssignedRecruiter] = useState("KingCam revenue desk");
  const [stageForm, setStageForm] = useState({ onboardingStage: "telegram_invited", conversionStage: "onboarding", telegramTransitionStatus: "invite_sent", stripeActivationStatus: "pending", moneyNextAction: "Move creator into Telegram onboarding and close Stripe-backed paid vault activation." });

  const utils = trpc.useUtils();
  const commandCenterQuery = trpc.conversionEngine.getCommandCenter.useQuery({ limit: 25 }, { refetchInterval: 30000 });
  const generateTopMutation = trpc.conversionEngine.generateForTopQueue.useMutation({
    onSuccess: async (result) => {
      toast.success(`Generated ${result.generatedCount} creator conversion workflows`);
      await utils.conversionEngine.getCommandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const generateCreatorMutation = trpc.conversionEngine.generateForCreator.useMutation({
    onSuccess: async (result) => {
      toast.success(`Generated conversion packet for @${result.profile.handle}`);
      await utils.conversionEngine.getCommandCenter.invalidate();
      setSelected(null);
      setProfileId("");
    },
    onError: (error) => toast.error(error.message),
  });
  const assignMutation = trpc.conversionEngine.assignRecruiter.useMutation({
    onSuccess: async () => {
      toast.success("Recruiter assignment persisted");
      await utils.conversionEngine.getCommandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const stageMutation = trpc.conversionEngine.advanceStage.useMutation({
    onSuccess: async () => {
      toast.success("Conversion stage advanced");
      await utils.conversionEngine.getCommandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const packageMutation = trpc.conversionEngine.seedRevenuePackages.useMutation({
    onSuccess: async (result) => {
      toast.success(`${result.seeded} high-ticket packages active`);
      await utils.conversionEngine.getCommandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const data = commandCenterQuery.data as { summary?: Record<string, unknown>; priorityQueue?: PriorityRow[]; packages?: PackageRow[] } | undefined;
  const summary = data?.summary || {};
  const priorityQueue = data?.priorityQueue || [];
  const packages = data?.packages || [];
  const activeSelection = selected || priorityQueue[0] || null;

  const moneyStats = useMemo(() => [
    { label: "Conversion intelligence", value: numberValue(summary.intelligence_generated), icon: Bot },
    { label: "Packets generated", value: numberValue(summary.packets_generated), icon: PackageCheck },
    { label: "Automation records", value: numberValue(summary.automation_records), icon: CheckCircle2 },
    { label: "Estimated leak", value: money(summary.estimated_lost_revenue_cents), icon: DollarSign },
    { label: "Recurring potential", value: money(summary.recurring_revenue_potential_cents), icon: Banknote },
    { label: "Telegram transitions", value: numberValue(summary.telegram_transitions), icon: MessageSquare },
  ], [summary]);

  function generateOne(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(profileId);
    if (!id || Number.isNaN(id)) {
      toast.error("Enter a valid Recruiter OS profile ID");
      return;
    }
    generateCreatorMutation.mutate({ profileId: id, assignedRecruiter });
  }

  function assignSelected() {
    if (!activeSelection) return;
    assignMutation.mutate({ profileId: activeSelection.profile_id, assignedRecruiter });
  }

  function advanceSelected() {
    if (!activeSelection) return;
    stageMutation.mutate({
      profileId: activeSelection.profile_id,
      onboardingStage: stageForm.onboardingStage as any,
      conversionStage: stageForm.conversionStage as any,
      telegramTransitionStatus: stageForm.telegramTransitionStatus as any,
      stripeActivationStatus: stageForm.stripeActivationStatus as any,
      moneyNextAction: stageForm.moneyNextAction,
      lastResponseSignal: "operator_stage_update",
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
              <Radar className="mr-1 h-3.5 w-3.5" /> CreatorVault Conversion Engine
            </Badge>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950">Creator Conversion Command Center</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Money-first acquisition intelligence, personalized conversion packets, follow-up automation, onboarding transitions, Telegram routing, Stripe activation tracking, and high-ticket packaging for the Recruiter OS queue.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => commandCenterQuery.refetch()} disabled={commandCenterQuery.isFetching}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh production data
            </Button>
            <Button onClick={() => generateTopMutation.mutate({ limit: 10, assignedRecruiter })} disabled={generateTopMutation.isPending}>
              <Sparkles className="mr-2 h-4 w-4" /> Generate top queue
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {moneyStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-slate-200 bg-white">
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-emerald-600" /> {stat.label}</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold text-slate-950">{stat.value}</p></CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="priority" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[720px]">
            <TabsTrigger value="priority">Priority Queue</TabsTrigger>
            <TabsTrigger value="packet">Packet</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
          </TabsList>

          <TabsContent value="priority" className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Generate conversion workflow from Recruiter OS</CardTitle>
                <CardDescription>Create durable intelligence, packet, automation, and acquisition priority records for one profile or the highest-scored queue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]" onSubmit={generateOne}>
                  <div className="space-y-2">
                    <Label htmlFor="profile-id">Recruiter OS profile ID</Label>
                    <Input id="profile-id" value={profileId} onChange={(event) => setProfileId(event.target.value)} placeholder="Enter profile ID" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assigned-recruiter">Assigned recruiter</Label>
                    <Input id="assigned-recruiter" value={assignedRecruiter} onChange={(event) => setAssignedRecruiter(event.target.value)} />
                  </div>
                  <div className="flex items-end"><Button className="w-full" type="submit" disabled={generateCreatorMutation.isPending}><Sparkles className="mr-2 h-4 w-4" /> Generate one</Button></div>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {priorityQueue.length ? priorityQueue.map((row) => <PriorityCard key={row.profile_id} row={row} onSelect={setSelected} />) : (
                <Card><CardHeader><CardTitle>No conversion records yet</CardTitle><CardDescription>Generate the top Recruiter OS queue to create the first durable conversion workflows.</CardDescription></CardHeader></Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="packet" className="space-y-6" id="packets">
            {activeSelection ? (
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{activeSelection.display_name || `@${activeSelection.handle}`} conversion packet</CardTitle>
                      <CardDescription>Personalized audit, trailer brief, and money-path proof generated from Recruiter OS signals.</CardDescription>
                    </div>
                    <Badge className={scoreClass(activeSelection.conversion_probability_score)}>{activeSelection.conversion_probability_score}/100 conversion</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <section className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-950">Personalized social audit</p><p className="mt-2 text-sm leading-6 text-blue-900">{activeSelection.personalized_social_audit}</p></section>
                  <section className="rounded-xl border border-violet-100 bg-violet-50 p-4"><p className="flex items-center text-sm font-semibold text-violet-950"><Clapperboard className="mr-2 h-4 w-4" /> Personalized trailer brief</p><p className="mt-2 text-sm leading-6 text-violet-900">{activeSelection.personalized_trailer_brief}</p></section>
                  <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-950">Next money action</p><p className="mt-2 text-sm leading-6 text-emerald-900">{activeSelection.next_money_action || activeSelection.money_next_action}</p></section>
                </CardContent>
              </Card>
            ) : (
              <Card><CardHeader><CardTitle>No packet selected</CardTitle><CardDescription>Open a creator from the acquisition priority queue.</CardDescription></CardHeader></Card>
            )}
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Conversion automation controls</CardTitle>
                <CardDescription>Persist recruiter ownership, onboarding stage progression, Telegram transition, and Stripe activation state for the selected creator.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeSelection ? <p className="text-sm text-muted-foreground">Selected creator: <strong>@{activeSelection.handle}</strong> · Current stage: <strong>{activeSelection.onboarding_stage}</strong> · Stripe: <strong>{activeSelection.stripe_activation_status}</strong> · Telegram: <strong>{activeSelection.telegram_transition_status}</strong></p> : <p className="text-sm text-muted-foreground">Select a creator from the priority queue to update automation state.</p>}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2"><Label>Assigned recruiter</Label><Input value={assignedRecruiter} onChange={(event) => setAssignedRecruiter(event.target.value)} /><Button className="mt-2" onClick={assignSelected} disabled={!activeSelection || assignMutation.isPending}><UserCheck className="mr-2 h-4 w-4" /> Persist assignment</Button></div>
                  <div className="space-y-2"><Label>Money next action</Label><Textarea value={stageForm.moneyNextAction} onChange={(event) => setStageForm((current) => ({ ...current, moneyNextAction: event.target.value }))} /></div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2"><Label>Onboarding stage</Label><Select value={stageForm.onboardingStage} onValueChange={(value) => setStageForm((current) => ({ ...current, onboardingStage: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{onboardingStages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Conversion stage</Label><Select value={stageForm.conversionStage} onValueChange={(value) => setStageForm((current) => ({ ...current, conversionStage: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{conversionStages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Telegram transition</Label><Select value={stageForm.telegramTransitionStatus} onValueChange={(value) => setStageForm((current) => ({ ...current, telegramTransitionStatus: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{telegramStages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Stripe activation</Label><Select value={stageForm.stripeActivationStatus} onValueChange={(value) => setStageForm((current) => ({ ...current, stripeActivationStatus: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stripeStages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <Button onClick={advanceSelected} disabled={!activeSelection || stageMutation.isPending}><ArrowUpRight className="mr-2 h-4 w-4" /> Advance conversion stage</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="space-y-6" id="priority">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><h2 className="text-2xl font-bold text-slate-950">High-ticket packaging shelf</h2><p className="text-muted-foreground">Packages reuse existing CreatorVault systems and convert infrastructure into paid offers.</p></div>
              <Button variant="outline" onClick={() => packageMutation.mutate()} disabled={packageMutation.isPending}><Crown className="mr-2 h-4 w-4" /> Refresh package catalog</Button>
            </div>
            <PackageShelf packages={packages} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
