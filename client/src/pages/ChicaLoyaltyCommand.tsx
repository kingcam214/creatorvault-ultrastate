import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Shield, AlertTriangle, TrendingDown, TrendingUp,
  Eye, Flame, Star, XCircle, CheckCircle, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// TIER SYSTEM
// ============================================================
const TIERS: Record<number, { label: string; color: string; bg: string; border: string; icon: string; range: string }> = {
  5: { label: "Elite", color: "text-yellow-400", bg: "from-yellow-900/50 to-orange-900/50", border: "border-yellow-500/60", icon: "👑", range: "850-1000" },
  4: { label: "Trusted", color: "text-emerald-400", bg: "from-emerald-900/50 to-teal-900/50", border: "border-emerald-500/60", icon: "💎", range: "700-849" },
  3: { label: "Developing", color: "text-blue-400", bg: "from-blue-900/50 to-indigo-900/50", border: "border-blue-500/60", icon: "⭐", range: "550-699" },
  2: { label: "On Notice", color: "text-orange-400", bg: "from-orange-900/50 to-red-900/50", border: "border-orange-500/60", icon: "⚠️", range: "400-549" },
  1: { label: "Probation", color: "text-red-400", bg: "from-red-900/50 to-rose-900/50", border: "border-red-500/60", icon: "🚨", range: "200-399" },
  0: { label: "Removed", color: "text-gray-500", bg: "from-gray-900/50 to-gray-900/50", border: "border-gray-700", icon: "💀", range: "0-199" },
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  on_notice: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  probation: "bg-red-500/20 text-red-300 border-red-500/30",
  suspended: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  removed: "bg-gray-800/50 text-gray-500 border-gray-700",
};

const WARN_CATEGORIES = [
  "dishonesty", "missed_tasks", "attitude", "content_violation",
  "rule_breach", "disloyalty", "financial_dispute", "other"
];

const LIE_CATEGORIES = [
  "follower_count", "revenue_reported", "content_posted",
  "platform_status", "personal_situation", "commitment_made", "other"
];

const POSITIVE_EVENTS = [
  { value: "loyalty_bonus", label: "Loyalty Bonus", pts: 50 },
  { value: "task_completed", label: "Task Completed", pts: 10 },
  { value: "revenue_milestone", label: "Revenue Milestone", pts: 25 },
  { value: "brand_deal_closed", label: "Brand Deal Closed", pts: 50 },
  { value: "honesty_bonus", label: "Honesty Bonus", pts: 30 },
  { value: "went_live", label: "Went Live", pts: 5 },
  { value: "content_posted", label: "Content Posted", pts: 3 },
  { value: "manual_adjustment", label: "Manual Adjustment", pts: 10 },
];

const NEGATIVE_EVENTS = [
  { value: "task_skipped", label: "Task Skipped", pts: 15 },
  { value: "rule_violation", label: "Rule Violation", pts: 50 },
  { value: "manual_adjustment", label: "Manual Adjustment", pts: 25 },
];

// ============================================================
// SCORE BAR
// ============================================================
function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full bg-white/5 rounded-full h-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ============================================================
// CHICA CARD
// ============================================================
function ChicaCard({ chica, onAction }: { chica: any; onAction: (action: string, chica: any) => void }) {
  const tier = TIERS[chica.tier] ?? TIERS[3];
  const taskRate = chica.total_tasks_assigned > 0
    ? Math.round((chica.total_tasks_completed / chica.total_tasks_assigned) * 100) : 0;

  return (
    <Card className={`p-6 bg-gradient-to-br ${tier.bg} border ${tier.border} relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{tier.icon}</span>
            <h3 className="text-xl font-bold text-white">{chica.chica_name}</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className={`text-xs border ${STATUS_COLORS[chica.status] ?? STATUS_COLORS.active}`}>
              {chica.status?.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={`text-xs ${tier.color} bg-white/5 border border-white/10`}>
              {tier.icon} {tier.label}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-black ${tier.color}`}>{chica.loyalty_score}</div>
          <div className="text-xs text-white/40">/ 1000 pts</div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Loyalty Score</span><span className={tier.color}>{chica.loyalty_score}/1000</span>
          </div>
          <ScoreBar value={chica.loyalty_score} max={1000}
            color={chica.tier >= 4 ? "bg-emerald-500" : chica.tier >= 3 ? "bg-blue-500" : "bg-red-500"} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Honesty</span>
            <span className={chica.honesty_score >= 80 ? "text-emerald-400" : "text-red-400"}>{chica.honesty_score}/100</span>
          </div>
          <ScoreBar value={chica.honesty_score} max={100}
            color={chica.honesty_score >= 80 ? "bg-emerald-500" : "bg-red-500"} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Task Rate</span>
            <span className={taskRate >= 70 ? "text-emerald-400" : "text-orange-400"}>{taskRate}%</span>
          </div>
          <ScoreBar value={taskRate} max={100} color={taskRate >= 70 ? "bg-emerald-500" : "bg-orange-500"} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5 text-center">
        <div className="p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-white">{chica.active_warnings}</div>
          <div className="text-xs text-white/40">Warnings</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-red-400">{chica.total_lies_logged}</div>
          <div className="text-xs text-white/40">Lies</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-emerald-400">{chica.total_tasks_completed}</div>
          <div className="text-xs text-white/40">Tasks</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-yellow-400">${Number(chica.total_revenue_generated || 0).toLocaleString()}</div>
          <div className="text-xs text-white/40">Revenue</div>
        </div>
      </div>

      <div className="p-3 bg-white/5 rounded-xl mb-4 border border-white/10">
        <div className="text-xs text-white/40 mb-1">Current Tier Earnings</div>
        <div className={`text-sm font-bold ${tier.color}`}>
          {chica.tier === 5 && "70% split + $250/mo + Co-Creator Status"}
          {chica.tier === 4 && "60% split + $100/mo + Brand Deal Priority"}
          {chica.tier === 3 && "55% split + Content Coaching"}
          {chica.tier === 2 && "50% split — No bonuses. Under review."}
          {chica.tier === 1 && "Basic access only. One more strike = removed."}
          {chica.tier === 0 && "REMOVED from program."}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30"
          onClick={() => onAction('add_points', chica)}>
          <TrendingUp className="w-3 h-3 mr-1" /> Add Points
        </Button>
        <Button size="sm" className="bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/30"
          onClick={() => onAction('deduct_points', chica)}>
          <TrendingDown className="w-3 h-3 mr-1" /> Deduct Points
        </Button>
        <Button size="sm" className="bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 border border-orange-500/30"
          onClick={() => onAction('issue_warning', chica)}>
          <AlertTriangle className="w-3 h-3 mr-1" /> Issue Warning
        </Button>
        <Button size="sm" className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30"
          onClick={() => onAction('log_lie', chica)}>
          <Eye className="w-3 h-3 mr-1" /> Log Lie
        </Button>
        {chica.status !== 'removed' && (
          <Button size="sm" className="bg-gray-600/30 hover:bg-gray-600/50 text-gray-300 border border-gray-500/30 col-span-2"
            onClick={() => onAction('remove', chica)}>
            <XCircle className="w-3 h-3 mr-1" /> Remove from Program
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ChicaLoyaltyCommand() {
  const { toast } = useToast();
  const [activeAction, setActiveAction] = useState<{ type: string; chica: any } | null>(null);
  const [formData, setFormData] = useState<any>({});

  const { data: profiles, isLoading, refetch: refetchProfiles } = trpc.loyalty.getAllProfiles.useQuery();
  const { data: recentEvents, refetch: refetchEvents } = trpc.loyalty.getRecentEvents.useQuery();

  const onSuccess = () => {
    refetchProfiles();
    refetchEvents();
    toast({ title: "Done", description: "Loyalty system updated." });
    setActiveAction(null);
    setFormData({});
  };

  const addPoints = trpc.loyalty.addPoints.useMutation({ onSuccess });
  const deductPoints = trpc.loyalty.deductPoints.useMutation({ onSuccess });
  const issueWarning = trpc.loyalty.issueWarning.useMutation({ onSuccess });
  const logLie = trpc.loyalty.logLie.useMutation({ onSuccess });
  const removeFromProgram = trpc.loyalty.removeFromProgram.useMutation({ onSuccess });

  const handleAction = (type: string, chica: any) => {
    setActiveAction({ type, chica });
    setFormData({ chicaUserId: chica.chica_user_id });
  };

  const handleSubmit = () => {
    if (!activeAction) return;
    const id = formData.chicaUserId;

    if (activeAction.type === 'add_points') {
      addPoints.mutate({
  // @ts-ignore
        chicaUserId: id,
        eventType: formData.eventType || 'manual_adjustment',
        points: Number(formData.points) || 10,
        description: formData.description || 'Points added',
      });
    } else if (activeAction.type === 'deduct_points') {
      deductPoints.mutate({
  // @ts-ignore
        chicaUserId: id,
        eventType: formData.eventType || 'manual_adjustment',
        points: Number(formData.points) || 10,
        description: formData.description || 'Points deducted',
      });
    } else if (activeAction.type === 'issue_warning') {
      issueWarning.mutate({
  // @ts-ignore
        chicaUserId: id,
        category: formData.category || 'other',
        severity: formData.severity || 'moderate',
        description: formData.description || '',
        consequence: formData.consequence || 'Further violations will result in tier downgrade.',
      });
    } else if (activeAction.type === 'log_lie') {
      logLie.mutate({
  // @ts-ignore
        chicaUserId: id,
        lieCategory: formData.lieCategory || 'other',
        whatWasClaimed: formData.whatWasClaimed || '',
        whatWasTrue: formData.whatWasTrue || '',
        impactLevel: formData.impactLevel || 'medium',
      });
    } else if (activeAction.type === 'remove') {
      removeFromProgram.mutate({
  // @ts-ignore
        chicaUserId: id,
        removalReason: formData.removalReason || 'Removed by owner',
      });
    }
  };

  // @ts-ignore
  const chicas: any[] = profiles || [];
  const avgScore = chicas.length > 0 ? Math.round(chicas.reduce((s, c) => s + c.loyalty_score, 0) / chicas.length) : 0;
  const eliteCount = chicas.filter(c => c.tier >= 4).length;
  const atRiskCount = chicas.filter(c => c.tier <= 2).length;
  const totalLies = chicas.reduce((s, c) => s + (c.total_lies_logged || 0), 0);

  const isPending = addPoints.isPending || deductPoints.isPending || issueWarning.isPending || logLie.isPending || removeFromProgram.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-yellow-400" />
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Chica Loyalty Command
          </h1>
          <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">OWNER ONLY</Badge>
        </div>
        <p className="text-white/50 text-sm">
          Real-time loyalty tracking, accountability enforcement, and tier management.
          Every lie, every missed task, every win — recorded permanently.
        </p>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 text-center">
          <div className="text-3xl font-black text-yellow-400">{avgScore}</div>
          <div className="text-xs text-white/50">Avg Loyalty Score</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 text-center">
          <div className="text-3xl font-black text-emerald-400">{eliteCount}</div>
          <div className="text-xs text-white/50">Trusted / Elite</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 text-center">
          <div className="text-3xl font-black text-red-400">{atRiskCount}</div>
          <div className="text-xs text-white/50">At Risk</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 text-center">
          <div className="text-3xl font-black text-purple-400">{totalLies}</div>
          <div className="text-xs text-white/50">Total Lies Logged</div>
        </Card>
      </div>

      {/* TIER LEGEND */}
      <Card className="p-4 bg-white/3 border border-white/10 mb-8">
        <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Tier System</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(TIERS).reverse().map(([tier, info]) => (
            <div key={tier} className={`p-2 rounded-lg bg-gradient-to-br ${info.bg} border ${info.border} text-center`}>
              <div className="text-lg">{info.icon}</div>
              <div className={`text-xs font-bold ${info.color}`}>{info.label}</div>
              <div className="text-xs text-white/30">{info.range}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* CHICA CARDS */}
      {isLoading ? (
        <div className="text-center text-white/40 py-12">Loading loyalty profiles...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {chicas.map((chica: any) => (
            <ChicaCard key={chica.chica_user_id} chica={chica} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* RECENT EVENTS */}
      <Card className="p-6 bg-white/3 border border-white/10 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" /> Recent Loyalty Events
        </h3>
  // @ts-ignore
        {recentEvents && (recentEvents as any[]).length > 0 ? (
          <div className="space-y-2">
  // @ts-ignore
            {(recentEvents as any[]).slice(0, 15).map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <span className={ev.points_change > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {ev.points_change > 0 ? "+" : ""}{ev.points_change}
                  </span>
                  <span className="text-white/60 text-xs">{ev.chica_name}</span>
                  <span className="text-white/70">{ev.description}</span>
                </div>
                <span className="text-white/30 text-xs">{new Date(ev.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm">No events yet. Use the action buttons above to start tracking.</p>
        )}
      </Card>

      {/* ACTION MODAL */}
      {activeAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-gray-900 border border-white/20 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {activeAction.type === 'add_points' && `Add Points — ${activeAction.chica.chica_name}`}
              {activeAction.type === 'deduct_points' && `Deduct Points — ${activeAction.chica.chica_name}`}
              {activeAction.type === 'issue_warning' && `Issue Warning — ${activeAction.chica.chica_name}`}
              {activeAction.type === 'log_lie' && `Log Lie — ${activeAction.chica.chica_name}`}
              {activeAction.type === 'remove' && `Remove — ${activeAction.chica.chica_name}`}
            </h3>

            <div className="space-y-4">
              {(activeAction.type === 'add_points' || activeAction.type === 'deduct_points') && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Event Type</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-sm"
                      onChange={(e) => {
                        const list = activeAction.type === 'add_points' ? POSITIVE_EVENTS : NEGATIVE_EVENTS;
                        const ev = list.find(x => x.value === e.target.value);
                        setFormData({ ...formData, eventType: e.target.value, points: ev?.pts || 10 });
                      }}>
                      <option value="">Select event...</option>
                      {(activeAction.type === 'add_points' ? POSITIVE_EVENTS : NEGATIVE_EVENTS).map(e => (
                        <option key={e.value} value={e.value}>{e.label} ({e.pts} pts)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Points</label>
                    <Input type="number" value={formData.points || ''} className="bg-white/10 border-white/20 text-white"
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Description</label>
                    <Textarea value={formData.description || ''} rows={3} className="bg-white/10 border-white/20 text-white"
                      placeholder="What happened? Be specific."
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </>
              )}

              {activeAction.type === 'issue_warning' && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Category</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-sm"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="">Select...</option>
                      {WARN_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Severity</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-sm"
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}>
                      <option value="minor">Minor (-25 pts)</option>
                      <option value="moderate">Moderate (-50 pts)</option>
                      <option value="severe">Severe (-100 pts)</option>
                      <option value="final">Final Warning (-150 pts)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">What happened</label>
                    <Textarea rows={3} className="bg-white/10 border-white/20 text-white" placeholder="Describe the violation."
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Consequence if repeated</label>
                    <Input className="bg-white/10 border-white/20 text-white" placeholder="e.g. Tier downgrade, removal"
                      onChange={(e) => setFormData({ ...formData, consequence: e.target.value })} />
                  </div>
                </>
              )}

              {activeAction.type === 'log_lie' && (
                <>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Lie Category</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-sm"
                      onChange={(e) => setFormData({ ...formData, lieCategory: e.target.value })}>
                      <option value="">Select...</option>
                      {LIE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">What she claimed</label>
                    <Textarea rows={2} className="bg-white/10 border-white/20 text-white"
                      onChange={(e) => setFormData({ ...formData, whatWasClaimed: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">What was actually true</label>
                    <Textarea rows={2} className="bg-white/10 border-white/20 text-white"
                      onChange={(e) => setFormData({ ...formData, whatWasTrue: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Impact Level</label>
                    <select className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white text-sm"
                      onChange={(e) => setFormData({ ...formData, impactLevel: e.target.value })}>
                      <option value="low">Low (-50 pts)</option>
                      <option value="medium">Medium (-100 pts)</option>
                      <option value="high">High (-200 pts)</option>
                      <option value="critical">Critical (-300 pts)</option>
                    </select>
                  </div>
                </>
              )}

              {activeAction.type === 'remove' && (
                <>
                  <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                    <p className="text-red-300 text-sm font-bold mb-2">⚠️ This action is permanent.</p>
                    <p className="text-white/60 text-sm">
                      Removing {activeAction.chica.chica_name} will lock her out of all program benefits permanently.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Reason for removal</label>
                    <Textarea rows={3} className="bg-white/10 border-white/20 text-white"
                      placeholder="Document the reason clearly."
                      onChange={(e) => setFormData({ ...formData, removalReason: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button className="flex-1 bg-white/10 hover:bg-white/20 text-white"
                onClick={() => { setActiveAction(null); setFormData({}); }}>
                Cancel
              </Button>
              <Button
                className={`flex-1 ${activeAction.type === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white font-bold`}
                onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
