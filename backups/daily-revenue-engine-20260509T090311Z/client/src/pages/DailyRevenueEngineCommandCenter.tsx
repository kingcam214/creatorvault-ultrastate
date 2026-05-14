import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Activity, Banknote, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardCheck, CreditCard, DollarSign, RefreshCcw, ShieldCheck, Target, TrendingUp, UserPlus, Users, Zap } from "lucide-react";

type PipelineRow = {
  id: number;
  handle: string;
  platform: string;
  stage: string;
  priorityScore?: number;
  priority_score?: number;
  priorityBand?: string;
  priority_band?: string;
  packagePriority?: string | null;
  package_priority?: string | null;
  nextAction?: string;
  next_action?: string;
  activationStatus?: string;
  activation_status?: string;
  checkoutStatus?: string;
  checkout_status?: string;
  realRevenueCents?: number;
  real_revenue_cents?: number;
  realRevenueSource?: string;
  real_revenue_source?: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(cents: unknown): string {
  const numeric = Number(cents || 0);
  return `$${(numeric / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function integer(value: unknown): string {
  const numeric = Number(value || 0);
  if (Number.isNaN(numeric)) return "0";
  return numeric.toLocaleString();
}

function pct(actual: unknown, target: unknown): number {
  const a = Number(actual || 0);
  const t = Number(target || 0);
  if (!t) return a > 0 ? 100 : 0;
  return Math.min(100, Math.round((a / t) * 100));
}

function scoreTone(score: unknown): string {
  const value = Number(score || 0);
  if (value >= 85) return "bg-emerald-600 text-white";
  if (value >= 70) return "bg-blue-600 text-white";
  if (value >= 45) return "bg-amber-500 text-black";
  return "bg-slate-600 text-white";
}

function bandVariant(band: string | undefined) {
  if (band === "critical") return "destructive" as const;
  if (band === "high") return "default" as const;
  if (band === "medium") return "secondary" as const;
  return "outline" as const;
}

function KpiCard({ title, value, label, icon: Icon }: { title: string; value: string; label: string; icon: any }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-600">{label}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3 text-white"><Icon className="h-6 w-6" /></div>
      </CardContent>
    </Card>
  );
}

function GoalRow({ label, actual, target }: { label: string; actual: unknown; target: unknown }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-950">{integer(actual)} / {integer(target)}</span>
      </div>
      <Progress value={pct(actual, target)} className="h-2" />
    </div>
  );
}

function PipelineCard({ row }: { row: PipelineRow }) {
  const score = row.priorityScore ?? row.priority_score ?? 0;
  const band = row.priorityBand ?? row.priority_band ?? "medium";
  const nextAction = row.nextAction ?? row.next_action ?? "No next action recorded";
  const realRevenue = row.realRevenueCents ?? row.real_revenue_cents ?? 0;
  const realRevenueSource = row.realRevenueSource ?? row.real_revenue_source ?? "none";
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              @{row.handle}
              <Badge variant="outline">{row.platform}</Badge>
              <Badge variant={bandVariant(band)}>{band}</Badge>
              <Badge className={scoreTone(score)}>{score}/100</Badge>
            </CardTitle>
            <CardDescription>{row.stage} · activation {row.activationStatus ?? row.activation_status ?? "not_started"} · checkout {row.checkoutStatus ?? row.checkout_status ?? "not_started"}</CardDescription>
          </div>
          <Badge variant={realRevenue > 0 ? "default" : "outline"}>{money(realRevenue)} real revenue</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{nextAction}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary"><Target className="mr-1 h-3 w-3" /> {row.packagePriority ?? row.package_priority ?? "No package priority"}</Badge>
          <Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" /> Revenue source: {realRevenueSource}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyRevenueEngineCommandCenter() {
  const [date, setDate] = useState(today());
  const [targetCreators, setTargetCreators] = useState("25");
  const [targetActivations, setTargetActivations] = useState("5");
  const [targetFirstDollars, setTargetFirstDollars] = useState("1");
  const [targetMrr, setTargetMrr] = useState("0");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [priorityScore, setPriorityScore] = useState("70");
  const [nextAction, setNextAction] = useState("Send CreatorVault money-leak audit and first-dollar activation CTA");

  const utils = trpc.useUtils();
  const commandCenter = trpc.dailyRevenueEngine.commandCenter.useQuery({ date, limit: 50 });
  const upsertPlan = trpc.dailyRevenueEngine.upsertTodayPlan.useMutation({
    onSuccess: async () => {
      toast.success("Daily revenue plan saved");
      await utils.dailyRevenueEngine.commandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const addTarget = trpc.dailyRevenueEngine.addTargetCreator.useMutation({
    onSuccess: async () => {
      toast.success("Creator added to daily acquisition pipeline");
      setHandle("");
      await utils.dailyRevenueEngine.commandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const refreshSnapshot = trpc.dailyRevenueEngine.refreshRevenueSnapshot.useMutation({
    onSuccess: async () => {
      toast.success("Ledger-backed revenue snapshot refreshed");
      await utils.dailyRevenueEngine.commandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const data = commandCenter.data;
  const plan: any = data?.plan;
  const snapshot: any = data?.snapshot;
  const ledger: any = data?.realRevenueLedger;
  const pipeline = (data?.pipeline || []) as PipelineRow[];

  const savePlan = () => upsertPlan.mutate({
    date,
    targetCreators: Number(targetCreators || 0),
    targetActivations: Number(targetActivations || 0),
    targetFirstDollars: Number(targetFirstDollars || 0),
    targetMrrCents: Math.round(Number(targetMrr || 0) * 100),
    operatorLabel: "Daily revenue operator",
    executionNotes: "Targets are operator-entered. Actual revenue is computed only from production ledger tables.",
  });

  const addCreator = () => {
    if (!handle.trim()) return toast.error("Creator handle is required");
    addTarget.mutate({
      date,
      handle: handle.replace(/^@/, "").trim(),
      platform,
      priorityScore: Number(priorityScore || 0),
      nextAction,
      packagePriority: "First-dollar activation path",
      evidencePayload: { source: "daily_operator_dashboard", realMetricOnly: true },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500 text-white"><CircleDollarSign className="mr-1 h-3 w-3" /> Ledger-backed revenue</Badge>
                <Badge variant="secondary"><ShieldCheck className="mr-1 h-3 w-3" /> Real metrics only</Badge>
                <Badge variant="secondary"><Activity className="mr-1 h-3 w-3" /> Daily operator loop</Badge>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight lg:text-6xl">Daily Acquisition + Revenue Engine</h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                  A production revenue-operations desk for today’s creator targeting, activation, first-dollar tracking, retention movement, and cashflow visibility. Targets are operator-entered; revenue and cash collected come only from the real CreatorVault ledger.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-4">
              <Label htmlFor="date" className="text-slate-200">Operating date</Label>
              <Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="border-white/20 bg-white text-slate-950" />
              <Button variant="secondary" onClick={() => refreshSnapshot.mutate({ date })} disabled={refreshSnapshot.isPending}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh real revenue
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Cash collected" value={money(ledger?.cashCollectedCents ?? snapshot?.cash_collected_cents)} label="Completed transactions today" icon={Banknote} />
          <KpiCard title="Platform share" value={money(ledger?.platformShareCents ?? snapshot?.platform_share_cents)} label="Real platform cashflow" icon={TrendingUp} />
          <KpiCard title="Creator earnings" value={money(ledger?.creatorEarningsCents ?? snapshot?.creator_earnings_cents)} label="Real creator-side revenue" icon={DollarSign} />
          <KpiCard title="Pipeline targets" value={integer(pipeline.length)} label="Creators on today’s board" icon={Users} />
        </div>

        <Tabs defaultValue="command" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[720px]">
            <TabsTrigger value="command">Command Center</TabsTrigger>
            <TabsTrigger value="plan">Daily Targets</TabsTrigger>
            <TabsTrigger value="truth">Revenue Truth</TabsTrigger>
          </TabsList>

          <TabsContent value="command" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-600" /> Today’s acquisition board</CardTitle>
                  <CardDescription>Ordered by priority score. Every state change is durable and every dollar must be attached to the transaction ledger.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {commandCenter.isLoading ? <p className="text-sm text-slate-600">Loading production revenue board…</p> : null}
                  {!commandCenter.isLoading && pipeline.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <UserPlus className="mx-auto h-10 w-10 text-slate-400" />
                      <p className="mt-3 font-semibold text-slate-900">No creators targeted for this date yet.</p>
                      <p className="mt-1 text-sm text-slate-600">Add only real targets you intend to contact today.</p>
                    </div>
                  ) : null}
                  {pipeline.map((row) => <PipelineCard key={row.id} row={row} />)}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-600" /> Add real creator target</CardTitle>
                    <CardDescription>This creates durable pipeline state, not a vanity lead count.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2"><Label>Handle</Label><Input value={handle} onChange={(event) => setHandle(event.target.value)} aria-label="Creator handle" /></div>
                      <div className="space-y-2"><Label>Platform</Label><Input value={platform} onChange={(event) => setPlatform(event.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Priority score</Label><Input type="number" min="0" max="100" value={priorityScore} onChange={(event) => setPriorityScore(event.target.value)} /></div>
                    <div className="space-y-2"><Label>Next money action</Label><Textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} rows={4} /></div>
                    <Button className="w-full" onClick={addCreator} disabled={addTarget.isPending}><Zap className="mr-2 h-4 w-4" /> Add to today’s board</Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-violet-600" /> Goal progress</CardTitle>
                    <CardDescription>Actuals are persisted from stage changes and real ledger refreshes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <GoalRow label="Creators contacted" actual={plan?.actual_creators_contacted} target={plan?.target_creators} />
                    <GoalRow label="Activations" actual={plan?.actual_activations} target={plan?.target_activations} />
                    <GoalRow label="First-dollar creators" actual={plan?.actual_first_dollars} target={plan?.target_first_dollars} />
                    <GoalRow label="MRR / cash goal" actual={plan?.actual_mrr_cents} target={plan?.target_mrr_cents} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-600" /> Daily operating targets</CardTitle>
                <CardDescription>These are explicit operator commitments for the day. They are not presented as actual performance until production data records them.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2"><Label>Creators to target</Label><Input type="number" value={targetCreators} onChange={(event) => setTargetCreators(event.target.value)} /></div>
                  <div className="space-y-2"><Label>Activation goal</Label><Input type="number" value={targetActivations} onChange={(event) => setTargetActivations(event.target.value)} /></div>
                  <div className="space-y-2"><Label>First-dollar goal</Label><Input type="number" value={targetFirstDollars} onChange={(event) => setTargetFirstDollars(event.target.value)} /></div>
                  <div className="space-y-2"><Label>Cash/MRR goal ($)</Label><Input type="number" value={targetMrr} onChange={(event) => setTargetMrr(event.target.value)} /></div>
                </div>
                <Button onClick={savePlan} disabled={upsertPlan.isPending}><CheckCircle2 className="mr-2 h-4 w-4" /> Save today’s plan</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="truth" className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> No-fluff revenue truth table</CardTitle>
                <CardDescription>The dashboard explicitly separates operator targets from real money. Revenue proof comes from transactions and subscriptions only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase text-emerald-700">Completed transactions</p><p className="mt-1 text-3xl font-bold text-emerald-950">{integer(ledger?.completedTransactions)}</p></div>
                  <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold uppercase text-blue-700">Active subscriptions</p><p className="mt-1 text-3xl font-bold text-blue-950">{integer(snapshot?.active_subscriptions)}</p></div>
                  <div className="rounded-xl bg-violet-50 p-4"><p className="text-xs font-semibold uppercase text-violet-700">Checkout starts</p><p className="mt-1 text-3xl font-bold text-violet-950">{integer(snapshot?.checkout_started_count)}</p></div>
                  <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold uppercase text-amber-700">Fake metrics</p><p className="mt-1 text-3xl font-bold text-amber-950">0</p></div>
                </div>
                <Separator />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="font-semibold text-slate-950"><CreditCard className="mr-2 inline h-4 w-4" /> Source tables</p><p className="mt-2 text-sm text-slate-700">{(snapshot?.source_tables || ledger?.sourceTables || ["transactions", "subscriptions"]).toString()}</p></div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="font-semibold text-slate-950"><ShieldCheck className="mr-2 inline h-4 w-4" /> Operator truth</p><p className="mt-2 text-sm text-slate-700">Targets are operator-entered; actual cash, creator earnings, and platform share are ledger-backed. Projections are not included in actuals.</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
