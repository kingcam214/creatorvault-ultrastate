import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  Flame,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Target,
  Users,
  Zap,
} from "lucide-react";

type SnapshotRow = {
  snapshot_date?: string;
  ledger_cash_collected_cents?: number;
  ledger_creator_earnings_cents?: number;
  ledger_platform_share_cents?: number;
  completed_transaction_count?: number;
  active_subscription_count?: number;
  active_mrr_cents?: number;
  first_dollar_creator_count?: number;
  activation_target_count?: number;
  activated_creator_count?: number;
  payout_pending_cents?: number;
  payout_completed_cents?: number;
  blocker_open_count?: number;
  urgent_intervention_count?: number;
  automated_outreach_sent?: boolean | number;
  projections_included?: boolean | number;
  synthetic_metrics_included?: boolean | number;
  revenue_is_ledger_backed?: boolean | number;
};

type CreatorStatusRow = {
  id: number;
  profile_id: number;
  creator_id?: number | null;
  pipeline_id?: number | null;
  conversion_packet_id?: number | null;
  handle: string;
  platform?: string;
  display_name?: string | null;
  activation_stage?: string;
  activation_status?: string;
  checkout_status?: string;
  renewal_status?: string;
  payout_status?: string;
  first_dollar_status?: string;
  ledger_cash_collected_cents?: number;
  active_subscription_count?: number;
  active_mrr_cents?: number;
  available_balance_cents?: number;
  pending_balance_cents?: number;
  priority_score?: number;
  priority_band?: string;
  blocker_count?: number;
  next_money_action?: string;
  intervention_priority?: number;
  revenue_is_ledger_backed?: boolean | number;
};

type BlockerRow = {
  id: number;
  profile_id: number;
  creator_id?: number | null;
  blocker_key?: string;
  blocker_label?: string;
  severity?: string;
  blocker_status?: string;
  next_resolution_action?: string;
  source_tables?: string;
};

type InterventionRow = {
  id: number;
  profile_id: number;
  creator_id?: number | null;
  intervention_type?: string;
  priority_score?: number;
  priority_band?: string;
  next_money_action?: string;
  review_status?: string;
  automated_outreach_sent?: boolean | number;
  source_tables?: string;
};

type Top5SprintRow = {
  id: number;
  sprint_date?: string;
  top5_rank: number;
  sprint_status?: string;
  handle: string;
  platform?: string;
  display_name?: string | null;
  niche?: string | null;
  activation_score?: number;
  priority_band?: string;
  risk_level?: string;
  approval_status?: string;
  checkout_status?: string;
  first_dollar_status?: string;
  retention_status?: string;
  payout_status?: string;
  primary_blocker_key?: string;
  primary_blocker_label?: string;
  primary_blocker_severity?: string;
  next_money_action?: string;
  ledger_cash_collected_cents?: number;
  completed_transaction_count?: number;
  active_subscription_count?: number;
  active_mrr_cents?: number;
  available_balance_cents?: number;
  pending_balance_cents?: number;
  payout_request_count?: number;
  projected_setup_revenue_cents?: number;
  projected_mrr_cents?: number;
  revenue_is_ledger_backed?: boolean | number;
  projections_included?: boolean | number;
  synthetic_metrics_included?: boolean | number;
  automated_outreach_sent?: boolean | number;
};

type Top5SprintSummary = {
  selected_count?: number;
  first_dollar_confirmed_count?: number;
  retained_count?: number;
  payout_ready_count?: number;
  open_blocker_count?: number;
  ledger_cash_collected_cents?: number;
  active_mrr_cents?: number;
};


type FirstDollarRecoveryRow = {
  id: number;
  source_table?: string;
  source_id_hash?: string;
  creator_id?: number | null;
  buyer_id?: number | null;
  offer_type?: string | null;
  offer_id_hash?: string | null;
  offer_title?: string | null;
  package_attempted?: string | null;
  recurring_tier_attempted?: string | null;
  vip_tier_attempted?: string | null;
  status?: string | null;
  checkout_started_at?: string | null;
  checkout_updated_at?: string | null;
  stripe_session_ref?: string | null;
  stripe_payment_intent_ref?: string | null;
  stripe_subscription_ref?: string | null;
  stripe_session_age_hours?: number | null;
  incomplete_payment_age_hours?: number | null;
  checkout_value_cents?: number;
  recurring_mrr_value_cents?: number;
  ledger_recovered_cents?: number;
  buyer_intent_level?: string | null;
  objection_key?: string | null;
  objection_summary?: string | null;
  friction_key?: string | null;
  friction_summary?: string | null;
  next_best_money_action?: string | null;
  recovery_priority_score?: number;
  recovery_priority_band?: string;
  operator_status?: string | null;
  operator_note?: string | null;
  checkout_is_stripe_session_backed?: boolean | number;
  revenue_is_ledger_backed?: boolean | number;
  synthetic_metrics_included?: boolean | number;
  fake_urgency_included?: boolean | number;
  automated_outreach_sent?: boolean | number;
};

type FirstDollarClockRow = {
  id: number;
  creator_id: number;
  first_dollar_proximity_score?: number;
  first_dollar_status?: string | null;
  time_since_onboarding_hours?: number | null;
  time_since_last_login_hours?: number | null;
  time_since_last_checkout_hours?: number | null;
  time_since_last_content_upload_hours?: number | null;
  time_since_offer_launch_hours?: number | null;
  time_since_telegram_ready_hours?: number | null;
  first_completed_transaction_id?: number | null;
  next_best_money_action?: string | null;
  revenue_is_ledger_backed?: boolean | number;
  synthetic_metrics_included?: boolean | number;
  fake_urgency_included?: boolean | number;
  automated_outreach_sent?: boolean | number;
};

type FirstDollarSummary = {
  abandoned_checkout_count?: number;
  critical_recovery_count?: number;
  high_recovery_count?: number;
  manual_action_count?: number;
  checkout_value_cents?: number;
  recurring_mrr_value_cents?: number;
  ledger_recovered_cents?: number;
  creators_close_to_first_dollar_count?: number;
  first_dollar_clock_count?: number;
};

type RecoveryOperatorStatus = "new" | "reviewing" | "contacted_manually" | "objection_logged" | "checkout_fixed" | "recovered_ledger_confirmed" | "closed_no_recovery";

const recoveryStatuses: RecoveryOperatorStatus[] = ["new", "reviewing", "contacted_manually", "objection_logged", "checkout_fixed", "recovered_ledger_confirmed", "closed_no_recovery"];


function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function cents(value: unknown): number {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function money(value: unknown): string {
  return `$${(cents(value) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function integer(value: unknown): string {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString();
}

function boolFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function titleize(value: string | undefined | null): string {
  return String(value || "unknown").replace(/_/g, " ");
}

function severityVariant(severity: string | undefined) {
  if (severity === "critical") return "destructive" as const;
  if (severity === "high") return "default" as const;
  if (severity === "medium") return "secondary" as const;
  return "outline" as const;
}

function scoreTone(score: unknown): string {
  const value = Number(score || 0);
  if (value >= 85) return "bg-red-600 text-white";
  if (value >= 70) return "bg-orange-500 text-white";
  if (value >= 45) return "bg-amber-500 text-black";
  return "bg-slate-600 text-white";
}

function KpiCard({ title, value, label, icon: Icon, tone = "dark" }: { title: string; value: string; label: string; icon: any; tone?: "dark" | "green" | "amber" | "red" }) {
  const toneClass = tone === "green" ? "bg-emerald-600" : tone === "amber" ? "bg-amber-500 text-black" : tone === "red" ? "bg-red-600" : "bg-slate-950";
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-600">{label}</p>
        </div>
        <div className={`rounded-2xl p-3 text-white ${toneClass}`}><Icon className="h-6 w-6" /></div>
      </CardContent>
    </Card>
  );
}

function TruthFlag({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />}
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs leading-5 text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function CreatorCard({ row }: { row: CreatorStatusRow }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              @{row.handle}
              <Badge variant="outline">{row.platform || "unknown"}</Badge>
              <Badge variant={severityVariant(row.priority_band)}>{titleize(row.priority_band)}</Badge>
              <Badge className={scoreTone(row.intervention_priority ?? row.priority_score)}>{integer(row.intervention_priority ?? row.priority_score)}/100 intervention</Badge>
            </CardTitle>
            <CardDescription>
              {row.display_name || "No display name"} · {titleize(row.activation_stage)} · checkout {titleize(row.checkout_status)} · renewal {titleize(row.renewal_status)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={cents(row.ledger_cash_collected_cents) > 0 ? "default" : "outline"}>{money(row.ledger_cash_collected_cents)} ledger cash</Badge>
            <Badge variant={Number(row.blocker_count || 0) > 0 ? "destructive" : "secondary"}>{integer(row.blocker_count)} blockers</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{row.next_money_action || "No next money action recorded"}</p>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div><p className="text-xs uppercase text-slate-500">First dollar</p><p className="font-semibold text-slate-900">{titleize(row.first_dollar_status)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">MRR</p><p className="font-semibold text-slate-900">{money(row.active_mrr_cents)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Balance</p><p className="font-semibold text-slate-900">{money(cents(row.available_balance_cents) + cents(row.pending_balance_cents))}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Payout</p><p className="font-semibold text-slate-900">{titleize(row.payout_status)}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}


function Top5SummaryStrip({ summary }: { summary: Top5SprintSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard title="Selected" value={integer(summary.selected_count)} label="must equal exactly five" icon={Target} tone={Number(summary.selected_count || 0) === 5 ? "green" : "red"} />
      <KpiCard title="First dollar" value={integer(summary.first_dollar_confirmed_count)} label="ledger-confirmed creators" icon={DollarSign} tone="green" />
      <KpiCard title="Retained" value={integer(summary.retained_count)} label="active recurring ledger" icon={RefreshCcw} />
      <KpiCard title="Payout ready" value={integer(summary.payout_ready_count)} label="balance or payout evidence" icon={Banknote} />
      <KpiCard title="Open blockers" value={integer(summary.open_blocker_count)} label="money progression blockers" icon={AlertTriangle} tone={Number(summary.open_blocker_count || 0) > 0 ? "red" : "dark"} />
      <KpiCard title="Ledger cash" value={money(summary.ledger_cash_collected_cents)} label="real completed transactions" icon={ShieldCheck} tone="green" />
    </div>
  );
}


function hoursLabel(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return "not recorded";
  if (numeric < 24) return `${Math.round(numeric)}h`;
  return `${Math.round(numeric / 24)}d`;
}

function RecoverySummaryStrip({ summary }: { summary: FirstDollarSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard title="Abandoned" value={integer(summary.abandoned_checkout_count)} label="Stripe-backed checkout rows" icon={CreditCard} tone={Number(summary.abandoned_checkout_count || 0) > 0 ? "amber" : "dark"} />
      <KpiCard title="Critical" value={integer(summary.critical_recovery_count)} label="score 80+ recovery priority" icon={AlertTriangle} tone={Number(summary.critical_recovery_count || 0) > 0 ? "red" : "dark"} />
      <KpiCard title="High" value={integer(summary.high_recovery_count)} label="score 60–79 recovery priority" icon={Flame} tone="amber" />
      <KpiCard title="Checkout value" value={money(summary.checkout_value_cents)} label="attempted one-time value" icon={Banknote} />
      <KpiCard title="MRR value" value={money(summary.recurring_mrr_value_cents)} label="attempted recurring value" icon={RefreshCcw} />
      <KpiCard title="Recovered" value={money(summary.ledger_recovered_cents)} label="ledger-confirmed only" icon={ShieldCheck} tone="green" />
    </div>
  );
}

function FirstDollarRecoveryCard({
  row,
  selectedStatus,
  operatorNote,
  onStatusChange,
  onAction,
  isUpdating,
}: {
  row: FirstDollarRecoveryRow;
  selectedStatus: RecoveryOperatorStatus;
  operatorNote: string;
  onStatusChange: (row: FirstDollarRecoveryRow, status: RecoveryOperatorStatus) => void;
  onAction: (row: FirstDollarRecoveryRow) => void;
  isUpdating: boolean;
}) {
  const stripeBacked = boolFlag(row.checkout_is_stripe_session_backed) && Boolean(row.stripe_session_ref || row.stripe_payment_intent_ref || row.stripe_subscription_ref);
  const exactTruth = stripeBacked && boolFlag(row.revenue_is_ledger_backed) && !boolFlag(row.synthetic_metrics_included) && !boolFlag(row.fake_urgency_included) && !boolFlag(row.automated_outreach_sent);
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Creator #{row.creator_id || "unknown"}
              <Badge variant="outline">{row.source_table || "source unknown"}</Badge>
              <Badge className={scoreTone(row.recovery_priority_score)}>{integer(row.recovery_priority_score)}/100 recovery</Badge>
              <Badge variant={severityVariant(row.recovery_priority_band)}>{titleize(row.recovery_priority_band)}</Badge>
            </CardTitle>
            <CardDescription>
              {row.offer_title || titleize(row.offer_type)} · {titleize(row.status)} · buyer intent {titleize(row.buyer_intent_level)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={stripeBacked ? "default" : "destructive"}>Stripe-session-backed</Badge>
            <Badge variant={exactTruth ? "outline" : "destructive"}>ledger-only safeguards</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div><p className="text-xs uppercase text-slate-500">Checkout value</p><p className="font-semibold text-slate-900">{money(row.checkout_value_cents)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">MRR value</p><p className="font-semibold text-slate-900">{money(row.recurring_mrr_value_cents)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Stripe session age</p><p className="font-semibold text-slate-900">{hoursLabel(row.stripe_session_age_hours)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Incomplete payment</p><p className="font-semibold text-slate-900">{hoursLabel(row.incomplete_payment_age_hours)}</p></div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            <p className="text-xs font-semibold uppercase text-amber-700">Objection analysis · {titleize(row.objection_key)}</p>
            <p>{row.objection_summary || "Operator must identify the human objection from the Stripe-backed abandoned checkout."}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
            <p className="text-xs font-semibold uppercase text-sky-700">Conversion friction · {titleize(row.friction_key)}</p>
            <p>{row.friction_summary || "Checkout friction is diagnosed from payment/session evidence without synthetic urgency."}</p>
          </div>
        </div>
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-900">Next-best-money-action:</span> {row.next_best_money_action || "Review the exact abandoned checkout and record the manual recovery action. No automated outreach is sent."}
        </p>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div><p className="text-xs uppercase text-slate-500">Offer type</p><p className="font-semibold text-slate-900">{titleize(row.offer_type)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Attempted package</p><p className="font-semibold text-slate-900">{row.package_attempted || row.recurring_tier_attempted || row.vip_tier_attempted || "not recorded"}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Source hash</p><p className="font-semibold text-slate-900">{row.source_id_hash || row.offer_id_hash || "not recorded"}</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-[240px_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Operator status</Label>
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={selectedStatus} onChange={(event) => onStatusChange(row, event.target.value as RecoveryOperatorStatus)}>
              {recoveryStatuses.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Operator note</Label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">{operatorNote}</p>
          </div>
          <Button disabled={isUpdating || !operatorNote.trim()} onClick={() => onAction(row)}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Record manual action
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FirstDollarClockCard({
  row,
  actionValue,
  onActionChange,
  onSave,
  isUpdating,
}: {
  row: FirstDollarClockRow;
  actionValue: string;
  onActionChange: (row: FirstDollarClockRow, value: string) => void;
  onSave: (row: FirstDollarClockRow) => void;
  isUpdating: boolean;
}) {
  const exactTruth = boolFlag(row.revenue_is_ledger_backed) && !boolFlag(row.synthetic_metrics_included) && !boolFlag(row.fake_urgency_included) && !boolFlag(row.automated_outreach_sent);
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Creator #{row.creator_id}
              <Badge className={scoreTone(row.first_dollar_proximity_score)}>{integer(row.first_dollar_proximity_score)}/100 proximity</Badge>
              <Badge variant={row.first_dollar_status === "ledger_confirmed" ? "default" : "outline"}>{titleize(row.first_dollar_status)}</Badge>
            </CardTitle>
            <CardDescription>First-dollar countdown is based on creator activity and ledger evidence only.</CardDescription>
          </div>
          <Badge variant={exactTruth ? "outline" : "destructive"}>ledger-only clock</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
          <div><p className="text-xs uppercase text-slate-500">Onboarding</p><p className="font-semibold text-slate-900">{hoursLabel(row.time_since_onboarding_hours)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Login</p><p className="font-semibold text-slate-900">{hoursLabel(row.time_since_last_login_hours)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Checkout</p><p className="font-semibold text-slate-900">{hoursLabel(row.time_since_last_checkout_hours)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Content upload</p><p className="font-semibold text-slate-900">{hoursLabel(row.time_since_last_content_upload_hours)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Offer launch</p><p className="font-semibold text-slate-900">{hoursLabel(row.time_since_offer_launch_hours)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Telegram ready</p><p className="font-semibold text-slate-900">{hoursLabel(row.time_since_telegram_ready_hours)}</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Next-best-money-action</Label>
            <Textarea className="min-h-[88px]" value={actionValue} onChange={(event) => onActionChange(row, event.target.value)} />
          </div>
          <Button disabled={isUpdating || !actionValue.trim()} onClick={() => onSave(row)}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Save clock action
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Top5SprintCard({ row, onAction, isUpdating }: { row: Top5SprintRow; onAction: (row: Top5SprintRow, status: "in_progress" | "blocked" | "resolved") => void; isUpdating: boolean }) {
  const realCash = cents(row.ledger_cash_collected_cents);
  const projectedSetup = cents(row.projected_setup_revenue_cents);
  const projectedMrr = cents(row.projected_mrr_cents);
  const exactTruth = boolFlag(row.revenue_is_ledger_backed) && !boolFlag(row.projections_included) && !boolFlag(row.synthetic_metrics_included) && !boolFlag(row.automated_outreach_sent);
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              #{row.top5_rank} @{row.handle}
              <Badge variant="outline">{row.platform || "unknown"}</Badge>
              <Badge className={scoreTone(row.activation_score)}>{integer(row.activation_score)}/100 activation</Badge>
              <Badge variant={severityVariant(row.primary_blocker_severity)}>{titleize(row.primary_blocker_severity)}</Badge>
            </CardTitle>
            <CardDescription>
              {row.display_name || "No display name"} · {titleize(row.niche)} · approval {titleize(row.approval_status)} · status {titleize(row.sprint_status)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={realCash > 0 ? "default" : "outline"}>{money(realCash)} real ledger cash</Badge>
            <Badge variant="secondary">{money(projectedSetup)} source setup projection</Badge>
            <Badge variant="secondary">{money(projectedMrr)} source MRR projection</Badge>
            <Badge variant={exactTruth ? "outline" : "destructive"}>no fake success</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-900">
          <span className="font-semibold">Primary blocker:</span> {row.primary_blocker_label || titleize(row.primary_blocker_key)}
        </div>
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{row.next_money_action || "Recover checkout and verify completed payment ledger evidence."}</p>
        <div className="grid gap-3 text-sm md:grid-cols-5">
          <div><p className="text-xs uppercase text-slate-500">Checkout</p><p className="font-semibold text-slate-900">{titleize(row.checkout_status)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">First dollar</p><p className="font-semibold text-slate-900">{titleize(row.first_dollar_status)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Retention</p><p className="font-semibold text-slate-900">{titleize(row.retention_status)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Payout</p><p className="font-semibold text-slate-900">{titleize(row.payout_status)}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Active MRR</p><p className="font-semibold text-slate-900">{money(row.active_mrr_cents)}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => onAction(row, "in_progress")}>Start work</Button>
          <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => onAction(row, "blocked")}>Mark blocked</Button>
          <Button size="sm" disabled={isUpdating} onClick={() => onAction(row, "resolved")}>Mark reviewed</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BlockerCard({ row, onResolve, isResolving }: { row: BlockerRow; onResolve: (row: BlockerRow) => void; isResolving: boolean }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {row.blocker_label || titleize(row.blocker_key)}
              <Badge variant={severityVariant(row.severity)}>{titleize(row.severity)}</Badge>
              <Badge variant="outline">profile #{row.profile_id}</Badge>
            </CardTitle>
            <CardDescription>{row.blocker_key}</CardDescription>
          </div>
          <Button size="sm" variant="outline" disabled={isResolving} onClick={() => onResolve(row)}>
            <ClipboardCheck className="mr-2 h-4 w-4" /> Mark reviewed/resolved
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{row.next_resolution_action || "Review source evidence and resolve blocker only after ledger-backed proof exists."}</p>
      </CardContent>
    </Card>
  );
}

function InterventionCard({ row, onReview, isUpdating }: { row: InterventionRow; onReview: (row: InterventionRow, status: "in_progress" | "reviewed" | "resolved" | "dismissed") => void; isUpdating: boolean }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Profile #{row.profile_id}
              <Badge className={scoreTone(row.priority_score)}>{integer(row.priority_score)}/100</Badge>
              <Badge variant={severityVariant(row.priority_band)}>{titleize(row.priority_band)}</Badge>
              <Badge variant={boolFlag(row.automated_outreach_sent) ? "destructive" : "outline"}>no auto-send</Badge>
            </CardTitle>
            <CardDescription>{titleize(row.intervention_type)} · {titleize(row.review_status)}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => onReview(row, "in_progress")}>Start</Button>
            <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => onReview(row, "reviewed")}>Reviewed</Button>
            <Button size="sm" disabled={isUpdating} onClick={() => onReview(row, "resolved")}>Resolve</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{row.next_money_action || "Operator chooses the next money action. Automated outreach remains disabled."}</p>
      </CardContent>
    </Card>
  );
}

export default function ActivationWarRoomCommandCenter() {
  const [date, setDate] = useState(today());
  const [limit, setLimit] = useState("50");
  const [resolutionNote, setResolutionNote] = useState("Operator reviewed blocker evidence in Activation War Room. Resolve only after ledger-backed source proof is confirmed; no automated outreach sent.");
  const [operatorNote, setOperatorNote] = useState("Operator reviewed next money action in Activation War Room. No automated outreach sent.");
  const [recoveryOperatorNote, setRecoveryOperatorNote] = useState("Operator reviewed Stripe-session-backed abandoned checkout and recorded a manual next-best-money-action. No automated outreach sent, no fake urgency used, and no recovery revenue counted until ledger-confirmed.");
  const [recoveryStatusById, setRecoveryStatusById] = useState<Record<number, RecoveryOperatorStatus>>({});
  const [clockActionById, setClockActionById] = useState<Record<number, string>>({});

  const utils = trpc.useUtils();
  const parsedLimit = Math.max(1, Math.min(200, Number(limit || 50)));
  const commandCenter = trpc.activationWarRoom.commandCenter.useQuery({ date, limit: parsedLimit }, { refetchInterval: 30000 });
  const top5Sprint = trpc.activationWarRoom.top5Sprint.useQuery({ date }, { refetchInterval: 30000 });
  const firstDollarRecovery = trpc.activationWarRoom.firstDollarRecovery.useQuery({ limit: parsedLimit }, { refetchInterval: 30000 });
  const refreshSnapshot = trpc.activationWarRoom.refreshSnapshot.useMutation({
    onSuccess: async () => {
      toast.success("Ledger-backed Activation War Room snapshot refreshed");
      await utils.activationWarRoom.commandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const refreshCreators = trpc.activationWarRoom.refreshCreatorStatuses.useMutation({
    onSuccess: async (result) => {
      toast.success(`Refreshed ${result.refreshed} creator activation statuses`);
      await utils.activationWarRoom.commandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const refreshTop5 = trpc.activationWarRoom.refreshTop5Sprint.useMutation({
    onSuccess: async (result) => {
      toast.success(`Refreshed ${result.refreshed} Top 5 sprint rows`);
      await utils.activationWarRoom.top5Sprint.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const reviewIntervention = trpc.activationWarRoom.recordInterventionReview.useMutation({
    onSuccess: async () => {
      toast.success("Intervention review status updated without sending outreach");
      await utils.activationWarRoom.commandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const recordTop5Action = trpc.activationWarRoom.recordTop5OperatorAction.useMutation({
    onSuccess: async () => {
      toast.success("Top 5 sprint action recorded without automated outreach");
      await utils.activationWarRoom.top5Sprint.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const resolveBlocker = trpc.activationWarRoom.recordBlockerResolution.useMutation({
    onSuccess: async () => {
      toast.success("Blocker resolution recorded with operator note");
      await utils.activationWarRoom.commandCenter.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const refreshRecovery = trpc.activationWarRoom.refreshFirstDollarRecovery.useMutation({
    onSuccess: async (result) => {
      toast.success(`Refreshed ${result.refreshed} First-Dollar Recovery rows`);
      await utils.activationWarRoom.firstDollarRecovery.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const recordRecoveryAction = trpc.activationWarRoom.recordFirstDollarRecoveryAction.useMutation({
    onSuccess: async () => {
      toast.success("First-Dollar Recovery manual action recorded without automated outreach");
      await utils.activationWarRoom.firstDollarRecovery.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const recordClockAction = trpc.activationWarRoom.recordFirstDollarClockAction.useMutation({
    onSuccess: async () => {
      toast.success("First-dollar clock next action saved without automated outreach");
      await utils.activationWarRoom.firstDollarRecovery.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const data = commandCenter.data;
  const snapshot = (data?.snapshot || {}) as SnapshotRow;
  const creators = (data?.creators || []) as CreatorStatusRow[];
  const blockers = (data?.blockers || []) as BlockerRow[];
  const interventions = (data?.interventions || []) as InterventionRow[];
  const top5Rows = (top5Sprint.data?.rows || []) as Top5SprintRow[];
  const top5Summary = (top5Sprint.data?.summary || {}) as Top5SprintSummary;
  const recoveryQueue = (firstDollarRecovery.data?.recoveryQueue || []) as FirstDollarRecoveryRow[];
  const firstDollarClocks = (firstDollarRecovery.data?.firstDollarClocks || []) as FirstDollarClockRow[];
  const recoverySummary = (firstDollarRecovery.data?.summary || {}) as FirstDollarSummary;
  const recoveryTruthFlags = firstDollarRecovery.data?.truthFlags || {};
  const urgentCreators = useMemo(() => creators.filter((row) => Number(row.intervention_priority || 0) >= 70 || Number(row.blocker_count || 0) > 0), [creators]);

  const refreshAll = () => {
    refreshSnapshot.mutate({ date });
    refreshCreators.mutate({ date, limit: parsedLimit });
    refreshTop5.mutate({ date });
    refreshRecovery.mutate({ limit: parsedLimit });
  };

  const review = (row: InterventionRow, status: "in_progress" | "reviewed" | "resolved" | "dismissed") => {
    reviewIntervention.mutate({ interventionId: row.id, status, operatorNote });
  };

  const recordTop5 = (row: Top5SprintRow, status: "in_progress" | "blocked" | "resolved") => {
    recordTop5Action.mutate({ sprintId: row.id, status, operatorNote });
  };

  const resolve = (row: BlockerRow) => {
    if (!resolutionNote.trim()) {
      toast.error("Resolution note is required before resolving a blocker");
      return;
    }
    resolveBlocker.mutate({ blockerId: row.id, resolutionNote });
  };

  const recoveryStatusFor = (row: FirstDollarRecoveryRow): RecoveryOperatorStatus => recoveryStatusById[row.id] || (row.operator_status as RecoveryOperatorStatus) || "reviewing";

  const setRecoveryStatus = (row: FirstDollarRecoveryRow, status: RecoveryOperatorStatus) => {
    setRecoveryStatusById((current) => ({ ...current, [row.id]: status }));
  };

  const recordRecovery = (row: FirstDollarRecoveryRow) => {
    if (!recoveryOperatorNote.trim()) {
      toast.error("Operator note is required before recording a recovery action");
      return;
    }
    recordRecoveryAction.mutate({
      recoveryId: row.id,
      operatorStatus: recoveryStatusFor(row),
      objectionKey: row.objection_key || undefined,
      frictionKey: row.friction_key || undefined,
      nextBestMoneyAction: row.next_best_money_action || undefined,
      operatorNote: recoveryOperatorNote,
    });
  };

  const clockActionFor = (row: FirstDollarClockRow): string => clockActionById[row.id] ?? row.next_best_money_action ?? "";

  const setClockAction = (row: FirstDollarClockRow, value: string) => {
    setClockActionById((current) => ({ ...current, [row.id]: value }));
  };

  const saveClockAction = (row: FirstDollarClockRow) => {
    const nextBestMoneyAction = clockActionFor(row);
    if (!nextBestMoneyAction.trim()) {
      toast.error("Next-best-money-action is required before saving a first-dollar clock");
      return;
    }
    recordClockAction.mutate({ clockId: row.id, nextBestMoneyAction });
  };

  const ledgerBacked = boolFlag(snapshot.revenue_is_ledger_backed) || data?.truthFlags?.revenueIsLedgerBacked === true;
  const noSynthetic = !boolFlag(snapshot.synthetic_metrics_included) && data?.truthFlags?.syntheticMetricsIncluded === false;
  const noProjections = !boolFlag(snapshot.projections_included) && data?.truthFlags?.projectionsIncluded === false;
  const noOutreach = !boolFlag(snapshot.automated_outreach_sent) && data?.truthFlags?.automatedOutreachSent === false;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card className="overflow-hidden border-slate-200 bg-slate-950 text-white shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500 text-slate-950"><ShieldCheck className="mr-1 h-3 w-3" /> Ledger-backed only</Badge>
                  <Badge variant="outline" className="border-white/25 text-white"><Lock className="mr-1 h-3 w-3" /> No automated outreach</Badge>
                  <Badge variant="outline" className="border-white/25 text-white"><Flame className="mr-1 h-3 w-3" /> Money-first activation</Badge>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight md:text-5xl">CreatorVault Activation War Room</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                    Operator system for activation, first-dollar outcomes, renewals, payouts, blocker resolution, and daily cashflow using actual ledgers only. Vanity projections and outbound automation are deliberately excluded.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[160px_110px_auto]">
                <div className="space-y-2">
                  <Label className="text-slate-200">Snapshot date</Label>
                  <Input className="border-white/20 bg-white/10 text-white" value={date} onChange={(event) => setDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Limit</Label>
                  <Input className="border-white/20 bg-white/10 text-white" value={limit} onChange={(event) => setLimit(event.target.value)} />
                </div>
                <Button className="self-end bg-white text-slate-950 hover:bg-slate-200" disabled={refreshSnapshot.isPending || refreshCreators.isPending} onClick={refreshAll}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh war room
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Cash collected" value={money(snapshot.ledger_cash_collected_cents)} label={`${integer(snapshot.completed_transaction_count)} completed transactions today`} icon={Banknote} tone="green" />
          <KpiCard title="Active MRR" value={money(snapshot.active_mrr_cents)} label={`${integer(snapshot.active_subscription_count)} active subscriptions`} icon={CreditCard} />
          <KpiCard title="First-dollar creators" value={integer(snapshot.first_dollar_creator_count)} label="Creators with completed payment ledger proof" icon={DollarSign} tone="green" />
          <KpiCard title="Urgent interventions" value={integer(snapshot.urgent_intervention_count)} label={`${integer(snapshot.blocker_open_count)} open blockers`} icon={AlertTriangle} tone={Number(snapshot.urgent_intervention_count || 0) > 0 ? "red" : "dark"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <TruthFlag label="Revenue is ledger-backed" ok={ledgerBacked} detail="Cash, MRR, first-dollar, balance, and payout states come from transactions, subscriptions, balances, and payout requests." />
          <TruthFlag label="No synthetic metrics" ok={noSynthetic} detail="The router writes synthetic_metrics_included = false and exposes source tables for auditability." />
          <TruthFlag label="No projections included" ok={noProjections} detail="The page shows actual ledger state and operator priorities, not forecasted revenue." />
          <TruthFlag label="No automated outreach sent" ok={noOutreach} detail="Interventions are operator-review rows; review actions update status without sending messages." />
        </div>

        <Tabs defaultValue="top5" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 bg-white">
            <TabsTrigger value="top5">Top 5 Sprint</TabsTrigger>
            <TabsTrigger value="creators">Creators</TabsTrigger>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
            <TabsTrigger value="blockers">Blockers</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
            <TabsTrigger value="proof">Proof</TabsTrigger>
          </TabsList>

          <TabsContent value="top5" className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Top 5 Creator Activation Sprint</h2>
                <p className="text-sm text-slate-600">Exactly five production-selected creators ranked by activation evidence. Source projections are separated from real ledger outcomes.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={Number(top5Summary.selected_count || 0) === 5 ? "default" : "destructive"}><Target className="mr-1 h-3 w-3" /> {integer(top5Summary.selected_count)} / 5 selected</Badge>
                <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> No automated outreach</Badge>
              </div>
            </div>
            <Top5SummaryStrip summary={top5Summary} />
            {Number(top5Summary.selected_count || 0) !== 5 && !top5Sprint.isLoading && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-sm font-medium text-red-900">Top 5 sprint proof requires exactly five rows for this date. Seed or refresh production sprint rows before treating the queue as complete.</CardContent>
              </Card>
            )}
            <div className="grid gap-4 lg:grid-cols-4">
              <TruthFlag label="Real outcomes are ledger-backed" ok={top5Rows.every((row) => boolFlag(row.revenue_is_ledger_backed))} detail="Cash, first-dollar, retention, and payout states are recomputed from ledger tables only." />
              <TruthFlag label="Projections are separated" ok={top5Rows.every((row) => !boolFlag(row.projections_included))} detail="Projected setup revenue and MRR are shown as source context, never counted as real revenue." />
              <TruthFlag label="No synthetic success" ok={top5Rows.every((row) => !boolFlag(row.synthetic_metrics_included))} detail="Rows preserve blockers until transactions, subscriptions, or payout evidence exists." />
              <TruthFlag label="No automated outreach" ok={top5Rows.every((row) => !boolFlag(row.automated_outreach_sent))} detail="Buttons record operator review only and do not send messages." />
            </div>
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Top 5 operator note</CardTitle>
                <CardDescription>This note is stored on Top 5 manual actions. It does not trigger outbound messages.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={operatorNote} onChange={(event) => setOperatorNote(event.target.value)} className="min-h-[90px]" />
              </CardContent>
            </Card>
            <div className="grid gap-4">
              {top5Rows.map((row) => <Top5SprintCard key={row.id} row={row} onAction={recordTop5} isUpdating={recordTop5Action.isPending} />)}
              {!top5Sprint.isLoading && top5Rows.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-600">No Top 5 sprint rows have been seeded for this date yet. Seed from the production-selected creator evidence, then refresh the sprint.</CardContent></Card>}
            </div>
          </TabsContent>


          <TabsContent value="creators" className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Creator activation priority queue</h2>
                <p className="text-sm text-slate-600">Sorted by intervention priority, priority score, and open blocker count.</p>
              </div>
              <Badge variant="outline"><Users className="mr-1 h-3 w-3" /> {integer(creators.length)} creator statuses</Badge>
            </div>
            <div className="grid gap-4">
              {(urgentCreators.length ? urgentCreators : creators).map((row) => <CreatorCard key={row.id} row={row} />)}
              {!commandCenter.isLoading && creators.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-600">No creator statuses have been materialized for this date yet. Use Refresh war room to compute statuses from live ledgers.</CardContent></Card>}
            </div>
          </TabsContent>

          <TabsContent value="interventions" className="space-y-4">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Operator note for intervention review</CardTitle>
                <CardDescription>This note is stored on review actions. It does not trigger outbound messages.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={operatorNote} onChange={(event) => setOperatorNote(event.target.value)} className="min-h-[90px]" />
              </CardContent>
            </Card>
            <div className="grid gap-4">
              {interventions.map((row) => <InterventionCard key={row.id} row={row} onReview={review} isUpdating={reviewIntervention.isPending} />)}
              {!commandCenter.isLoading && interventions.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-600">No queued or in-progress interventions for this date.</CardContent></Card>}
            </div>
          </TabsContent>

          <TabsContent value="blockers" className="space-y-4">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Blocker resolution note</CardTitle>
                <CardDescription>Resolution is an operator record only; resolve blockers after confirming source-table evidence.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} className="min-h-[90px]" />
              </CardContent>
            </Card>
            <div className="grid gap-4">
              {blockers.map((row) => <BlockerCard key={row.id} row={row} onResolve={resolve} isResolving={resolveBlocker.isPending} />)}
              {!commandCenter.isLoading && blockers.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-600">No open blockers for this date.</CardContent></Card>}
            </div>
          </TabsContent>


          <TabsContent value="recovery" className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold">First-Dollar Recovery</h2>
                <p className="text-sm text-slate-600">Checkout conversion recovery for Stripe-session-backed abandoned checkouts, first-dollar clocks, objection analysis, conversion friction, and manual next-best-money-actions only.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={refreshRecovery.isPending} onClick={() => refreshRecovery.mutate({ limit: parsedLimit })}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh recovery
                </Button>
                <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> No send controls</Badge>
              </div>
            </div>
            <RecoverySummaryStrip summary={recoverySummary} />
            <div className="grid gap-4 lg:grid-cols-5">
              <TruthFlag label="Checkout data is Stripe-session-backed" ok={recoveryTruthFlags.checkoutIsStripeSessionBacked === true && recoveryQueue.every((row) => boolFlag(row.checkout_is_stripe_session_backed))} detail="The live queue filters to rows with Stripe session, payment intent, or subscription reference evidence before scoring recovery priority." />
              <TruthFlag label="Revenue is ledger-backed only" ok={recoveryTruthFlags.revenueIsLedgerBacked === true && recoveryQueue.every((row) => boolFlag(row.revenue_is_ledger_backed))} detail="Recovered amounts remain zero until completed transaction ledger evidence exists; attempted checkout value is not counted as recovered revenue." />
              <TruthFlag label="No synthetic metrics" ok={recoveryTruthFlags.syntheticMetricsIncluded === false && recoveryQueue.every((row) => !boolFlag(row.synthetic_metrics_included))} detail="Recovery scores are derived from persisted checkout evidence and ledger fields, not fabricated success metrics." />
              <TruthFlag label="No fake urgency" ok={recoveryTruthFlags.fakeUrgencyIncluded === false && recoveryQueue.every((row) => !boolFlag(row.fake_urgency_included))} detail="The system exposes actual session ages and stale-checkout status without manufacturing countdown pressure." />
              <TruthFlag label="No automated outreach" ok={recoveryTruthFlags.automatedOutreachSent === false && recoveryTruthFlags.outboundSendEnabled === false && recoveryQueue.every((row) => !boolFlag(row.automated_outreach_sent))} detail="Actions record operator notes and status only; there are no auto-send or outbound execution controls in this tab." />
            </div>
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Recovery operator note</CardTitle>
                <CardDescription>This note is stored when recording manual recovery actions. It does not trigger email, SMS, Telegram, or any other outbound send.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={recoveryOperatorNote} onChange={(event) => setRecoveryOperatorNote(event.target.value)} className="min-h-[100px]" />
              </CardContent>
            </Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">Abandoned checkout recovery queue</h3>
                <Badge variant="outline">{integer(recoveryQueue.length)} Stripe-backed rows</Badge>
              </div>
              <div className="grid gap-4">
                {recoveryQueue.map((row) => (
                  <FirstDollarRecoveryCard
                    key={row.id}
                    row={row}
                    selectedStatus={recoveryStatusFor(row)}
                    operatorNote={recoveryOperatorNote}
                    onStatusChange={setRecoveryStatus}
                    onAction={recordRecovery}
                    isUpdating={recordRecoveryAction.isPending}
                  />
                ))}
                {!firstDollarRecovery.isLoading && recoveryQueue.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-600">No Stripe-session-backed abandoned checkouts are currently in the First-Dollar Recovery queue.</CardContent></Card>}
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">First-dollar countdown clocks</h3>
                <Badge variant="outline">{integer(recoverySummary.creators_close_to_first_dollar_count)} close to first dollar</Badge>
              </div>
              <div className="grid gap-4">
                {firstDollarClocks.map((row) => (
                  <FirstDollarClockCard
                    key={row.id}
                    row={row}
                    actionValue={clockActionFor(row)}
                    onActionChange={setClockAction}
                    onSave={saveClockAction}
                    isUpdating={recordClockAction.isPending}
                  />
                ))}
                {!firstDollarRecovery.isLoading && firstDollarClocks.length === 0 && <Card><CardContent className="p-6 text-sm text-slate-600">No first-dollar clocks have been materialized yet. Refresh recovery after applying the First-Dollar Recovery seed and migration.</CardContent></Card>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="proof" className="space-y-4">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Ledger-source proof</CardTitle>
                <CardDescription>Activation War Room source tables and safeguards exposed by the backend command center.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Creator earnings</p><p className="text-lg font-bold">{money(snapshot.ledger_creator_earnings_cents)}</p></div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Platform share</p><p className="text-lg font-bold">{money(snapshot.ledger_platform_share_cents)}</p></div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Payout exposure</p><p className="text-lg font-bold">{money(cents(snapshot.payout_pending_cents) + cents(snapshot.payout_completed_cents))}</p></div>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {(data?.sourceTables || []).map((table: string) => <Badge key={table} variant="outline">{table}</Badge>)}
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  This UI intentionally exposes no send button. Refresh actions recompute materialized status rows from production source tables, while review and resolution actions update Activation War Room audit tables only.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
