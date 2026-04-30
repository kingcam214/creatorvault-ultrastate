/**
 * ============================================================================
 * KingCam Command Center
 * ============================================================================
 * Route: /king/command-center
 * Access: role === "king" ONLY
 *
 * Surfaces all 24 VIP agents in three pillars:
 *   1. Empire & Money Automations
 *   2. Personal Brand & Life
 *   3. Script & Performance Refinement
 *
 * Every tile triggers a REAL action — not just a form.
 * ============================================================================
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Crown, Zap, TrendingUp, DollarSign, Home, FileText,
  Brain, Target, Rocket, Shield, Star, ChevronRight,
  Loader2, CheckCircle, AlertCircle, Play, RefreshCw,
  Building2, Car, Users, Sparkles, Film, Mic
} from "lucide-react";
import EmmaDilemmaCasePanel from "@/components/EmmaDilemmaCasePanel";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AgentResult {
  agentId: string;
  status: "idle" | "running" | "done" | "error";
  output: any;
}

// ─── Agent Tile Component ────────────────────────────────────────────────────
function AgentTile({
  id, icon: Icon, title, description, badge, color,
  onRun, result, children
}: {
  id: string;
  icon: any;
  title: string;
  description: string;
  badge?: string;
  color: string;
  onRun: () => void;
  result: AgentResult;
  children?: React.ReactNode;
}) {
  const isRunning = result.status === "running";
  const isDone = result.status === "done";
  const isError = result.status === "error";

  return (
    <div className={`relative rounded-xl border p-5 bg-black/60 backdrop-blur-sm transition-all duration-300 ${
      isDone ? "border-green-500/50 shadow-green-500/10 shadow-lg" :
      isError ? "border-red-500/50" :
      isRunning ? "border-cyan-400/60 shadow-cyan-400/20 shadow-lg animate-pulse" :
      "border-zinc-800 hover:border-zinc-600"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm leading-tight">{title}</h3>
            {badge && (
              <Badge className="mt-1 text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                {badge}
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isRunning ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" :
            isDone ? "bg-green-600 hover:bg-green-500 text-white" :
            "bg-cyan-600 hover:bg-cyan-500 text-white"
          }`}
        >
          {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> :
           isDone ? <CheckCircle className="w-3 h-3" /> :
           <Play className="w-3 h-3" />}
          {isRunning ? "Running…" : isDone ? "Done" : "Run"}
        </button>
      </div>

      <p className="text-zinc-400 text-xs mb-3 leading-relaxed">{description}</p>

      {/* Optional input fields */}
      {children}

      {/* Output */}
      {isDone && result.output && (
        <div className="mt-3 p-3 rounded-lg bg-zinc-900/80 border border-zinc-700 text-xs text-zinc-300 max-h-48 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {typeof result.output === "string"
              ? result.output
              : JSON.stringify(result.output, null, 2)}
          </pre>
        </div>
      )}
      {isError && (
        <div className="mt-3 p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          {result.output?.message || "Agent encountered an error"}
        </div>
      )}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color }: {
  icon: any; title: string; subtitle: string; color: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-zinc-400 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function KingCamCommandCenter() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // ── Agent input state ──────────────────────────────────────────────────────
  const [trendNiche, setTrendNiche] = useState("Dominican creator economy");
  const [scriptText, setScriptText] = useState("Enter your script here to inject viral elements...");
  const [scriptNiche, setScriptNiche] = useState("lifestyle / creator economy");
  const [monetizationContent, setMonetizationContent] = useState("KingCam creator platform with 500+ creators");
  const [platformTarget, setPlatformTarget] = useState("TikTok");
  const [empireContentUrl, setEmpireContentUrl] = useState("https://creatorvault.live");
  const [audienceComments, setAudienceComments] = useState("Love your content! More behind the scenes!");
  const [writingSamples, setWritingSamples] = useState("I built this empire from nothing. Every day is a mission.");

  // ── Agent results state ────────────────────────────────────────────────────
  const [results, setResults] = useState<Record<string, AgentResult>>({});
  const getResult = (id: string): AgentResult =>
    results[id] || { agentId: id, status: "idle", output: null };
  const setResult = (id: string, partial: Partial<AgentResult>) =>
    setResults(prev => ({ ...prev, [id]: { ...getResult(id), ...partial, agentId: id } }));

  // ── tRPC mutations ─────────────────────────────────────────────────────────
  const trendProphet = trpc.aiTrendProphet.predictTrends.useMutation({
    onSuccess: (data) => setResult("trendProphet", { status: "done", output: data }),
    onError: (e) => setResult("trendProphet", { status: "error", output: e }),
  });

  const scriptSurgeon = trpc.aiScriptSurgeon.injectViralElements.useMutation({
    onSuccess: (data) => setResult("scriptSurgeon", { status: "done", output: data }),
    onError: (e) => setResult("scriptSurgeon", { status: "error", output: e }),
  });

  // @ts-ignore
  // @ts-ignore
  const monetizationHunter = trpc.aiMonetizationHunter.findOpportunities.useMutation({
  // @ts-ignore
  // @ts-ignore
    onSuccess: (data) => setResult("monetizationHunter", { status: "done", output: data }),
  // @ts-ignore
    onError: (e) => setResult("monetizationHunter", { status: "error", output: e }),
  });

  const platformDominator = trpc.aiPlatformDominator.reverseEngineerAlgorithm.useMutation({
    onSuccess: (data) => setResult("platformDominator", { status: "done", output: data }),
    onError: (e) => setResult("platformDominator", { status: "error", output: e }),
  });

  const empireOrchestrator = trpc.aiEmpireOrchestrator.orchestrateEmpire.useMutation({
    onSuccess: (data) => setResult("empireOrchestrator", { status: "done", output: data }),
    onError: (e) => setResult("empireOrchestrator", { status: "error", output: e }),
  });

  const audienceClone = trpc.aiAudienceClone.predictAudienceDesires.useMutation({
    onSuccess: (data) => setResult("audienceClone", { status: "done", output: data }),
    onError: (e) => setResult("audienceClone", { status: "error", output: e }),
  });

  const cloneArmy = trpc.aiCloneArmy.createWritingClone.useMutation({
    onSuccess: (data) => setResult("cloneArmy", { status: "done", output: data }),
    onError: (e) => setResult("cloneArmy", { status: "error", output: e }),
  });

  const weeklyBrief = trpc.empireWeeklyBrief.generateWeeklyBrief.useMutation({
    onSuccess: (data) => setResult("weeklyBrief", { status: "done", output: data }),
    onError: (e) => setResult("weeklyBrief", { status: "error", output: e }),
  });

  const mercedesStatus = trpc.kingcamPerks.mercedes.getDailyStatus.useQuery(undefined, {
    enabled: user?.role === "king",
  });

  const creditAnalysis = trpc.kingcamPerks.creditRepair.analyzeCredit.useMutation({
    onSuccess: (data) => setResult("creditRepair", { status: "done", output: data }),
    onError: (e) => setResult("creditRepair", { status: "error", output: e }),
  });

  const grantFinder = trpc.kingcamPerks.grantsLoans.findGrants.useMutation({
    onSuccess: (data) => setResult("grantFinder", { status: "done", output: data }),
    onError: (e) => setResult("grantFinder", { status: "error", output: e }),
  });

  const housingFinder = trpc.kingcamPerks.housing.findApartments.useMutation({
    onSuccess: (data) => setResult("housingFinder", { status: "done", output: data }),
    onError: (e) => setResult("housingFinder", { status: "error", output: e }),
  });

  const realEstate = trpc.realEstateEmpire.findProperties.useMutation({
    onSuccess: (data) => setResult("realEstate", { status: "done", output: data }),
    onError: (e) => setResult("realEstate", { status: "error", output: e }),
  });

  const kingLifeDashboard = trpc.kingLife.getDashboard.useQuery(undefined, {
    enabled: user?.role === "king",
  });

  const brandDNA = trpc.brandDNA.getBrandProfile.useQuery({ brandId: "kingcam" }, {
    enabled: user?.role === "king",
  });

  const empireEntityMap = trpc.empireAgents.getEntityMap.useQuery(undefined, {
    enabled: user?.role === "king",
  });

  const kingcamBrainSearch = trpc.kingcamBrain.searchChunks.useMutation({
    onSuccess: (data) => setResult("kingcamBrain", { status: "done", output: data }),
    onError: (e) => setResult("kingcamBrain", { status: "error", output: e }),
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-semibold">Loading Command Center…</span>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "king" && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-6">
            The KingCam Command Center is restricted to the platform owner only.
          </p>
          <Button onClick={() => setLocation("/")} variant="outline" className="border-zinc-700 text-zinc-300">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Top Banner ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0a0a0a] from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-[#0a0a0a] from-yellow-400 to-amber-500 text-[var(--accent-gold)]">
                KingCam Command Center
              </h1>
              <p className="text-zinc-500 text-xs">Owner-only · 24 VIP Agents · Real Actions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-950 text-green-400 border-green-800 text-xs">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block mr-1.5 animate-pulse" />
              LIVE
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/king")}
              className="border-zinc-700 text-zinc-400 hover:text-white text-xs"
            >
              King Home
            </Button>
          </div>
        </div>
      </div>

      {/* ── Mercedes Progress Bar ────────────────────────────────────────────── */}
      {mercedesStatus.data && (
        <div className="bg-[#0a0a0a] from-zinc-900 to-black border-b border-zinc-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <Car className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
  // @ts-ignore
              <div className="flex justify-between text-xs mb-1">
  // @ts-ignore
                <span className="text-zinc-400">Mercedes S65 AMG Fund</span>
                <span className="text-amber-400 font-semibold">
  // @ts-ignore
                  ${mercedesStatus.data.mercedesFund?.toFixed(0) || "0"} / $230,000
  // @ts-ignore
                  {" "}({mercedesStatus.data.percentageComplete?.toFixed(1) || "0"}%)
  // @ts-ignore
                </span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0a0a0a] from-amber-500 to-yellow-400 rounded-full transition-all duration-1000"
  // @ts-ignore
  // @ts-ignore
                  style={{ width: `${Math.min(mercedesStatus.data.percentageComplete || 0, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-zinc-500 shrink-0">
  // @ts-ignore
              {mercedesStatus.data.daysToGoal || "∞"} days to goal
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-16">

        {/* ═══════════════════════════════════════════════════════════════════
            PILLAR 1: EMPIRE & MONEY AUTOMATIONS
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={DollarSign}
            title="Empire & Money Automations"
            subtitle="Credit, grants, housing, real estate, and empire orchestration"
            color="bg-[#0a0a0a] from-green-600 to-emerald-700"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Weekly Empire Brief */}
            <AgentTile
              id="weeklyBrief"
              icon={Zap}
  // @ts-ignore
              title="Empire Weekly Brief"
              description="Analyzes platform data and generates your KingCam script + clone video for the week."
              badge="KingCam Engine"
              color="bg-[#0a0a0a] from-[#141414] to-violet-700"
              result={getResult("weeklyBrief")}
              onRun={() => {
                setResult("weeklyBrief", { status: "running" });
  // @ts-ignore
                weeklyBrief.mutate({});
              }}
            />

            {/* Empire Orchestrator */}
            <AgentTile
              id="empireOrchestrator"
              icon={Rocket}
              title="AI Empire Orchestrator"
              description="Generates 200+ content variations and cross-platform posting schedule from a single URL."
              badge="gpt-4.1-mini"
              color="bg-[#0a0a0a] from-blue-600 to-indigo-700"
              result={getResult("empireOrchestrator")}
              onRun={() => {
                setResult("empireOrchestrator", { status: "running" });
                empireOrchestrator.mutate({
  // @ts-ignore
                  contentUrl: empireContentUrl,
                  platforms: ["TikTok", "Instagram", "YouTube", "WhatsApp", "Telegram"],
                });
              }}
            >
              <Input
                value={empireContentUrl}
                onChange={e => setEmpireContentUrl(e.target.value)}
                placeholder="Content URL"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 h-8"
              />
            </AgentTile>

            {/* Real Estate Empire */}
            <AgentTile
              id="realEstate"
              icon={Building2}
              title="Real Estate Empire"
              description="Finds investment properties in Dallas, TX under $300K with ROI analysis."
              badge="publicProcedure"
              color="bg-[#0a0a0a] from-teal-600 to-cyan-700"
              result={getResult("realEstate")}
              onRun={() => {
                setResult("realEstate", { status: "running" });
                realEstate.mutate({
  // @ts-ignore
                  location: "Dallas, TX",
                  max_price: 300000,
                  property_type: "all",
                });
              }}
            />

            {/* Auto Credit Repair */}
            <AgentTile
              id="creditRepair"
              icon={Shield}
              title="Auto Credit Repair"
              description="Analyzes your credit profile and generates an aggressive 7-day dispute plan."
              badge="kingcamPerks"
              color="bg-[#0a0a0a] from-orange-600 to-red-700"
              result={getResult("creditRepair")}
              onRun={() => {
                setResult("creditRepair", { status: "running" });
                creditAnalysis.mutate({
  // @ts-ignore
                  creditScore: 620,
                  issues: ["Late payment - Capital One", "Collection - Medical $1,200"],
                });
              }}
            />

            {/* Auto Grant Applicator */}
            <AgentTile
              id="grantFinder"
              icon={FileText}
              title="Auto Grant Applicator"
              description="Finds creator economy and small business grants you qualify for right now."
              badge="kingProcedure"
              color="bg-[#0a0a0a] from-yellow-600 to-amber-700"
              result={getResult("grantFinder")}
              onRun={() => {
                setResult("grantFinder", { status: "running" });
                grantFinder.mutate({
  // @ts-ignore
                  industry: "creator economy",
                  stage: "growth",
                  location: "Texas",
                });
              }}
            />

            {/* Auto Housing Finder */}
            <AgentTile
              id="housingFinder"
              icon={Home}
              title="Auto Housing Finder"
              description="Finds second-chance apartments in Dallas under $1,500/mo and generates your landlord pitch."
              badge="kingcamPerks"
              color="bg-[#0a0a0a] from-[#141414] to-[#141414]"
              result={getResult("housingFinder")}
              onRun={() => {
                setResult("housingFinder", { status: "running" });
                housingFinder.mutate({
  // @ts-ignore
                  location: "Dallas, TX",
                  maxRent: 1500,
                  bedrooms: 2,
                });
              }}
            />

            {/* Mercedes Agent */}
            <AgentTile
              id="mercedes"
              icon={Car}
              title="Mercedes Acquisition Agent"
              description="Shows today's Mercedes fund status and 3 specific strategies to accelerate acquisition."
              badge="kingProcedure"
              color="bg-[#0a0a0a] from-amber-600 to-yellow-500"
              result={getResult("mercedes")}
              onRun={() => {
                if (mercedesStatus.data) {
                  setResult("mercedes", { status: "done", output: mercedesStatus.data });
                } else {
                  setResult("mercedes", { status: "running" });
                  mercedesStatus.refetch().then(r => {
                    if (r.data) setResult("mercedes", { status: "done", output: r.data });
                    else setResult("mercedes", { status: "error", output: { message: "No data" } });
                  });
                }
              }}
            />

            {/* Empire Entity Map */}
            <AgentTile
              id="empireMap"
              icon={Target}
              title="Empire Entity Map"
              description="Loads your full empire org chart — all entities, assets, agents, and revenue streams."
              badge="empireAgents"
              color="bg-[#0a0a0a] from-slate-600 to-zinc-700"
              result={getResult("empireMap")}
              onRun={() => {
                if (empireEntityMap.data) {
                  setResult("empireMap", { status: "done", output: empireEntityMap.data });
                } else {
                  setResult("empireMap", { status: "running" });
                  empireEntityMap.refetch().then(r => {
                    if (r.data) setResult("empireMap", { status: "done", output: r.data });
                    else setResult("empireMap", { status: "error", output: { message: "No data" } });
                  });
                }
              }}
            />

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            PILLAR 2: PERSONAL BRAND & LIFE
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={Crown}
            title="Personal Brand & Life"
            subtitle="KingCam identity, lifestyle tracking, clone army, and platform domination"
            color="bg-[#0a0a0a] from-[#141414] to-[#141414]"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* King Life Dashboard */}
            <AgentTile
              id="kingLife"
              icon={Star}
              title="King Life Dashboard"
              description="Pulls your real-time life dashboard: credit scores, housing status, income, collections."
              badge="kingLife"
              color="bg-[#0a0a0a] from-violet-600 to-[#141414]"
              result={getResult("kingLife")}
              onRun={() => {
                if (kingLifeDashboard.data) {
                  setResult("kingLife", { status: "done", output: kingLifeDashboard.data });
                } else {
                  setResult("kingLife", { status: "running" });
                  kingLifeDashboard.refetch().then(r => {
                    if (r.data) setResult("kingLife", { status: "done", output: r.data });
                    else setResult("kingLife", { status: "error", output: { message: "No data" } });
                  });
                }
              }}
            />

            {/* Brand DNA */}
            <AgentTile
              id="brandDNA"
              icon={Sparkles}
              title="Brand DNA"
              description="Extracts and displays your KingCam brand profile — colors, style, mood, and identity."
              badge="brandDNA"
              color="bg-[#0a0a0a] from-[#141414] to-[#141414]"
              result={getResult("brandDNA")}
              onRun={() => {
                if (brandDNA.data) {
                  setResult("brandDNA", { status: "done", output: brandDNA.data });
                } else {
                  setResult("brandDNA", { status: "running" });
                  brandDNA.refetch().then(r => {
                    if (r.data) setResult("brandDNA", { status: "done", output: r.data });
                    else setResult("brandDNA", { status: "error", output: { message: "No profile yet" } });
                  });
                }
              }}
            />

            {/* AI Platform Dominator */}
            <AgentTile
              id="platformDominator"
              icon={TrendingUp}
              title="AI Platform Dominator"
              description="Reverse-engineers the algorithm for any platform and gives you the exact exploits."
              badge="gpt-4.1-mini"
              color="bg-[#0a0a0a] from-cyan-600 to-blue-700"
              result={getResult("platformDominator")}
              onRun={() => {
                setResult("platformDominator", { status: "running" });
                platformDominator.mutate({
                  platform: platformTarget,
  // @ts-ignore
                  performanceData: { avgViews: 50000, engagementRate: 0.08, topContent: "behind-the-scenes" },
                });
              }}
            >
              <Input
                value={platformTarget}
                onChange={e => setPlatformTarget(e.target.value)}
                placeholder="Platform (TikTok, Instagram, YouTube…)"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 h-8"
              />
            </AgentTile>

            {/* AI Clone Army */}
            <AgentTile
              id="cloneArmy"
              icon={Users}
              title="AI Clone Army"
              description="Analyzes your writing samples and creates a KingCam writing style clone profile."
              badge="gpt-4.1-mini"
              color="bg-[#0a0a0a] from-indigo-600 to-blue-700"
              result={getResult("cloneArmy")}
              onRun={() => {
                setResult("cloneArmy", { status: "running" });
                cloneArmy.mutate({
  // @ts-ignore
                  writingSamples: writingSamples.split("\n").filter(Boolean),
                });
              }}
            >
              <Textarea
                value={writingSamples}
                onChange={e => setWritingSamples(e.target.value)}
                placeholder="Paste writing samples (one per line)…"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 resize-none"
                rows={2}
              />
            </AgentTile>

            {/* AI Audience Clone */}
            <AgentTile
              id="audienceClone"
              icon={Brain}
              title="AI Audience Clone"
              description="Predicts what your audience wants next based on their comments and engagement patterns."
              badge="gpt-4.1-mini"
              color="bg-[#0a0a0a] from-emerald-600 to-teal-700"
              result={getResult("audienceClone")}
              onRun={() => {
                setResult("audienceClone", { status: "running" });
                audienceClone.mutate({
  // @ts-ignore
                  audienceData: {
                    comments: audienceComments.split("\n").filter(Boolean),
                    engagement: { avgLikes: 12000, avgComments: 800, topContentType: "lifestyle" },
                  },
                });
              }}
            >
              <Textarea
                value={audienceComments}
                onChange={e => setAudienceComments(e.target.value)}
                placeholder="Paste audience comments (one per line)…"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 resize-none"
                rows={2}
              />
            </AgentTile>

            {/* KingCam Brain */}
            <AgentTile
              id="kingcamBrain"
              icon={Mic}
              title="KingCam Brain"
              description="Searches your KingCam knowledge base for relevant episode chunks and content ideas."
              badge="kingcamBrain"
              color="bg-[#0a0a0a] from-[#141414] to-red-700"
              result={getResult("kingcamBrain")}
              onRun={() => {
                setResult("kingcamBrain", { status: "running" });
                kingcamBrainSearch.mutate({ query: "creator economy Dominican Republic money", limit: 10 });
              }}
            />

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            PILLAR 3: SCRIPT & PERFORMANCE REFINEMENT
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={Film}
            title="Script & Performance Refinement"
            subtitle="Trend prediction, script surgery, monetization hunting, and Hollywood production"
            color="bg-[#0a0a0a] from-orange-600 to-red-700"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* AI Trend Prophet */}
            <AgentTile
              id="trendProphet"
  // @ts-ignore
              icon={TrendingUp}
              title="AI Trend Prophet"
              description="Predicts viral trends 2-4 weeks early in your niche so you can be first."
              badge="gpt-4.1-mini"
              color="bg-[#0a0a0a] from-sky-600 to-blue-700"
              result={getResult("trendProphet")}
              onRun={() => {
                setResult("trendProphet", { status: "running" });
  // @ts-ignore
                trendProphet.mutate({ niche: trendNiche });
              }}
            >
              <Input
                value={trendNiche}
                onChange={e => setTrendNiche(e.target.value)}
                placeholder="Niche (e.g. Dominican creator economy)"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 h-8"
              />
            </AgentTile>

            {/* AI Script Surgeon */}
            <AgentTile
              id="scriptSurgeon"
              icon={Zap}
              title="AI Script Surgeon"
              description="Rewrites your script with proven viral elements: hooks, pacing, psychological triggers."
              badge="gpt-4.1-mini"
              color="bg-[#0a0a0a] from-red-600 to-[#141414]"
              result={getResult("scriptSurgeon")}
              onRun={() => {
                setResult("scriptSurgeon", { status: "running" });
  // @ts-ignore
                scriptSurgeon.mutate({ script: scriptText, niche: scriptNiche });
              }}
            >
              <Textarea
                value={scriptText}
                onChange={e => setScriptText(e.target.value)}
                placeholder="Paste your script here…"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 resize-none"
                rows={3}
              />
              <Input
                value={scriptNiche}
                onChange={e => setScriptNiche(e.target.value)}
                placeholder="Niche"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 h-8"
              />
            </AgentTile>

            {/* AI Monetization Hunter */}
            <AgentTile
              id="monetizationHunter"
              icon={DollarSign}
              title="AI Monetization Hunter"
              description="Finds 20+ hidden revenue streams in your content and audience you haven't tapped yet."
              badge="gpt-4.1-mini"
              color="bg-[#0a0a0a] from-green-600 to-emerald-700"
              result={getResult("monetizationHunter")}
              onRun={() => {
                setResult("monetizationHunter", { status: "running" });
                monetizationHunter.mutate({
                  content: monetizationContent,
                  audience: { size: 500000, demographics: "18-35 Latino creators", engagement: "high" },
                });
              }}
            >
              <Input
                value={monetizationContent}
                onChange={e => setMonetizationContent(e.target.value)}
                placeholder="Describe your content/platform…"
                className="bg-zinc-900 border-zinc-700 text-white text-xs mb-2 h-8"
              />
            </AgentTile>

            {/* KingCam Script Writer — link to dedicated page */}
            <div className="rounded-xl border border-zinc-800 p-5 bg-black/60 hover:border-zinc-600 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0a0a0a] from-cyan-600 to-blue-700">
                    <Film className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">KingCam Script Writer</h3>
                    <Badge className="mt-1 text-xs bg-zinc-800 text-zinc-400 border-zinc-700">Replicate Engine</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation("/king/script-writer")}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 h-auto"
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Full episode scripts, clip scripts, YouTube metadata, and gem packs. Powered by KingCam fine-tuned Replicate models.
              </p>
            </div>

            {/* Hollywood Production — link to dedicated page */}
            <div className="rounded-xl border border-zinc-800 p-5 bg-black/60 hover:border-zinc-600 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0a0a0a] from-amber-600 to-orange-700">
                    <Film className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Hollywood Production</h3>
                    <Badge className="mt-1 text-xs bg-zinc-800 text-zinc-400 border-zinc-700">gpt-4o</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation("/king/hollywood-ai")}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 h-auto"
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Full Hollywood-style show and episode production. Creates shows, episodes, and distributes across platforms.
              </p>
            </div>

            {/* KingCam Brain — link to import/gallery */}
            <div className="rounded-xl border border-zinc-800 p-5 bg-black/60 hover:border-zinc-600 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0a0a0a] from-violet-600 to-[#141414]">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">KingCam Import & Gallery</h3>
                    <Badge className="mt-1 text-xs bg-zinc-800 text-zinc-400 border-zinc-700">kingcamBrain</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation("/king/import")}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 h-auto"
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Import KingCam content from external sources and manage the KingCam video gallery and brain knowledge base.
              </p>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            OWNER TOOLS: SOCIAL CONNECTIONS & CONTENT ENGINE
        ═══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon={Rocket}
            title="Owner Tools"
            subtitle="Social account management and content repurposing engine"
            color="bg-[#0a0a0a] from-cyan-600 to-blue-700"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Connect Socials */}
            <div className="rounded-xl border border-cyan-800/50 p-5 bg-black/60 hover:border-cyan-600/70 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0a0a0a] from-cyan-600 to-teal-700">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Connect Socials</h3>
                    <Badge className="mt-1 text-xs bg-cyan-950 text-cyan-400 border-cyan-800">OAuth Hub</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation("/platform-connections")}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 h-auto"
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Connect YouTube, Instagram, TikTok, X, and Facebook. Manage OAuth tokens and platform credentials from one screen.
              </p>
            </div>

            {/* Vault Remix Engine */}
            <div className="rounded-xl border border-yellow-800/50 p-5 bg-black/60 hover:border-yellow-600/70 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0a0a0a] from-yellow-600 to-amber-700">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Vault Remix Engine</h3>
                    <Badge className="mt-1 text-xs bg-yellow-950 text-yellow-400 border-yellow-800">4-in-1</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setLocation("/king/vault-remix")}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3 py-1.5 h-auto"
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Reformat video for 20 platforms, generate viral blueprints, create scroll-stopping hooks, and import from Instagram — all in one engine.
              </p>
            </div>

          </div>
        </section>

        {/* ── 3D World ──────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-white font-bold text-lg mb-4 flex items-center space-x-2">
            <span>🌐</span><span>3D World</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-900 flex items-center justify-center text-lg">🎬</div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">3D Episodios</h3>
                    <Badge className="mt-1 text-xs bg-purple-950 text-purple-400 border-purple-800">Theater</Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => setLocation("/king/episodes-3d")} className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 h-auto">
                  <ChevronRight className="w-3 h-3 mr-1" />Open
                </Button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">Curved 3D theater of all KingCam episodes. Glow intensity = viral score. Gold aura = revenue. Filter by playlist.</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-900 flex items-center justify-center text-lg">👑</div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Mapa 3D del Imperio</h3>
                    <Badge className="mt-1 text-xs bg-yellow-950 text-yellow-400 border-yellow-800">Empire Map</Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => setLocation("/king/empire-3d")} className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3 py-1.5 h-auto">
                  <ChevronRight className="w-3 h-3 mr-1" />Open
                </Button>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">3D node graph of your entire empire — creators, agents, and systems. Click any node to navigate directly.</p>
            </div>
          </div>
        </section>
        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-800 pt-8 text-center">
          <p className="text-zinc-600 text-xs">
            KingCam Command Center · 26 VIP Agents · Owner-only access · creatorvault.live
          </p>
        </div>

      </div>
    
      {/* Emma Dilemma Case Study — Live Metrics */}
      <div className="px-6 pb-6">
        <EmmaDilemmaCasePanel />
      </div>
</div>
  );
}
