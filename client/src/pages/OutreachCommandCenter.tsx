/**
 * VaultX Outreach Command Center
 * Live lead pipeline | 50 daily outreach messages | Hourly revenue summary
 * AI Chat Assistant for creator replies | Automated Director status
 */
import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { useToast } from "../hooks/use-toast";

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "#1DA1F2",
  reddit: "#FF4500",
  instagram: "#E1306C",
  telegram: "#0088cc",
};

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "#00ff88" : score >= 60 ? "#ffcc00" : "#ff6b6b";

export default function OutreachCommandCenter() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"warroom" | "pipeline" | "director" | "revenue">("warroom");
  const [selectedCreators, setSelectedCreators] = useState<any[]>([]);
  const [replyModal, setReplyModal] = useState<{ handle: string; message: string } | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [replyHistory, setReplyHistory] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [directorImageUrl, setDirectorImageUrl] = useState("");
  const [directorStyle, setDirectorStyle] = useState<"desire" | "velvet" | "sunrise" | "midnight" | "natural">("desire");

  // tRPC calls
  const scrapeCreators = trpc.creatorOutreach.scrapeCreators.useMutation();
  const queueOutreach = trpc.creatorOutreach.queueDailyOutreach.useMutation();
  const handleReply = trpc.creatorOutreach.handleCreatorReply.useMutation();
  const { data: outreachStats } = trpc.creatorOutreach.getOutreachStats.useQuery();
  const { data: hourlySummary, refetch: refetchSummary } = trpc.revenueReporting.getHourlySummary.useQuery();
  const { data: revenueBreakdown } = trpc.revenueReporting.getRevenueBreakdown.useQuery({ period: "day" });
  const { data: pipelineHealth } = trpc.revenueReporting.getPipelineHealth.useQuery();
  const { data: creditCheck } = trpc.automatedDirector.checkCredits.useQuery();
  const applyMotion = trpc.automatedDirector.applyMotion.useMutation();
  const applyStyle = trpc.automatedDirector.applyStyle.useMutation();
  const applyEnhance = trpc.automatedDirector.applyEnhance.useMutation();
  const runPipeline = trpc.automatedDirector.runFullPipeline.useMutation();
  const vaultxConfigQuery = trpc.vaultxAcquisition.getConfig.useQuery(undefined, { retry: false, refetchInterval: 45000 });
  const vaultxBoardQuery = trpc.vaultxAcquisition.getBoard.useQuery({ limit: 80 }, { retry: false, refetchInterval: 30000 });
  const vaultxProofQuery = trpc.vaultxAcquisition.getProof.useQuery({ limit: 80 }, { retry: false, refetchInterval: 30000 });
  const bootstrapAcquisition = trpc.vaultxAcquisition.bootstrap.useMutation({
    onSuccess: () => {
      vaultxConfigQuery.refetch();
      vaultxBoardQuery.refetch();
      vaultxProofQuery.refetch();
    },
  });
  const runAcquisitionNow = trpc.vaultxAcquisition.runNow.useMutation({
    onSuccess: () => {
      vaultxBoardQuery.refetch();
      vaultxProofQuery.refetch();
    },
  });

  const acquisitionConfig = ((vaultxConfigQuery.data as any)?.config ?? {}) as any;
  const acquisitionBoard = ((vaultxBoardQuery.data ?? {}) as any);
  const acquisitionProof = ((vaultxProofQuery.data ?? {}) as any);
  const acquisitionLeads = ((acquisitionBoard.leads ?? []) as any[]);
  const acquisitionActions = ((acquisitionBoard.actions ?? []) as any[]);
  const acquisitionHandoffs = ((acquisitionBoard.handoffs ?? []) as any[]);
  const acquisitionRuns = ((acquisitionBoard.runs ?? []) as any[]);
  const acquisitionTelemetry = ((acquisitionProof.telemetry ?? []) as any[]);
  const acquisitionSummary = ((acquisitionProof.summary ?? {}) as any);
  const acquisitionLiveEnabled = acquisitionConfig.liveSendsEnabled === true || acquisitionConfig.enabled === true;
  const acquisitionBusy = bootstrapAcquisition.isPending || runAcquisitionNow.isPending;

  const refreshAcquisitionWarRoom = () => {
    vaultxConfigQuery.refetch();
    vaultxBoardQuery.refetch();
    vaultxProofQuery.refetch();
  };

  const handleBootstrapAcquisition = async () => {
    try {
      await bootstrapAcquisition.mutateAsync();
      toast({ title: "Acquisition schema verified", description: "The operator tables and proof ledger are ready." });
    } catch (e: any) {
      toast({ title: "Bootstrap failed", description: e.message, variant: "destructive" });
    }
  };

  const handleRunAcquisition = async (mode: "test" | "manual") => {
    try {
      const result = await runAcquisitionNow.mutateAsync({ mode, sourceLimit: 80, outreachLimit: 50, followUpLimit: 50 });
      const proof = result as any;
      toast({
        title: mode === "test" ? "Test acquisition sweep complete" : "Manual acquisition sweep complete",
        description: `Sourced ${proof?.sourced ?? 0}, queued ${proof?.queued ?? 0}, sent ${proof?.sent ?? 0}, dry-run ${proof?.dryRun === false ? "off" : "on"}, failed ${proof?.failed ?? 0}.`,
      });
    } catch (e: any) {
      toast({ title: "Acquisition sweep failed", description: e.message, variant: "destructive" });
    }
  };

  // Auto-refresh revenue summary every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => refetchSummary(), 60000);
    return () => clearInterval(interval);
  }, [refetchSummary]);

  const handleScanAndQueue = async () => {
    setIsScanning(true);
    try {
      const result = await scrapeCreators.mutateAsync({
        platform: "both",
        niche: "body positive adult creator fitness wellness",
        count: 60,
      });
      setSelectedCreators(result.creators);
      toast({ title: `Found ${result.total} creators`, description: `${result.highIntent} high-intent leads` });

      // Auto-queue top 50
      const queued = await queueOutreach.mutateAsync({
        creators: result.creators.slice(0, 50),
        dailyLimit: 50,
      });
      toast({
        title: `${queued.queued} messages queued`,
        description: "Daily outreach pipeline armed. Messages ready to send.",
      });
    } catch (e: any) {
      toast({ title: "Scan error", description: e.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreatorReply = async () => {
    if (!replyModal || !replyInput.trim()) return;
    try {
      const result = await handleReply.mutateAsync({
        creatorHandle: replyModal.handle,
        creatorMessage: replyInput,
        conversationHistory: replyHistory,
      });
      setReplyHistory(prev => [
        ...prev,
        { role: "user", content: replyInput },
        { role: "assistant", content: result.reply },
      ]);
      setReplyInput("");
      if (result.isReady && result.magicLink) {
        toast({ title: "Creator ready to sign up!", description: `Magic Link: ${result.magicLink}` });
      }
    } catch (e: any) {
      toast({ title: "Reply error", description: e.message, variant: "destructive" });
    }
  };

  const handleRunDirector = async () => {
    if (!directorImageUrl) {
      toast({ title: "No image URL", description: "Enter a creator image URL to process", variant: "destructive" });
      return;
    }
    try {
      const result = await runPipeline.mutateAsync({
        imageUrl: directorImageUrl,
        creatorId: "manual",
        style: directorStyle,
        enhanceType: "full",
        outputType: "video",
      });
      toast({ title: "Pipeline complete!", description: `Output: ${result.finalUrl}` });
      window.open(result.finalUrl, "_blank");
    } catch (e: any) {
      toast({ title: "Director error", description: e.message, variant: "destructive" });
    }
  };

  const statusDot = (ok: boolean | undefined) => (
    <span style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: ok ? "#00ff88" : "#ff4444",
      marginRight: 6,
    }} />
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 50%, #0a0a0f 100%)",
      color: "#fff",
      fontFamily: "'Inter', sans-serif",
      padding: "24px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}>⚡</div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Outreach Command Center
            </h1>
            <p style={{ color: "#888", margin: 0, fontSize: 14 }}>
              Autonomous Creator Onboarding & Monetization Pipeline
            </p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{
              background: "rgba(0,255,136,0.1)",
              border: "1px solid rgba(0,255,136,0.3)",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              color: "#00ff88",
            }}>
              {statusDot(pipelineHealth?.status === "Active")}
              {pipelineHealth?.status || "Checking..."}
            </div>
          </div>
        </div>

        {/* Hourly Summary Bar */}
        {hourlySummary && (
          <div style={{
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 10,
            padding: "12px 20px",
            fontFamily: "monospace",
            fontSize: 13,
            color: "#c4b5fd",
            marginTop: 12,
          }}>
            {hourlySummary.summary}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Creators Onboarded", value: hourlySummary?.onboarded ?? 0, icon: "👤", color: "#7c3aed" },
          { label: "Leads Contacted", value: hourlySummary?.leadsContacted ?? 0, icon: "📨", color: "#db2777" },
          { label: "Today's Revenue", value: `$${(hourlySummary?.totalRevenue ?? 0).toFixed(2)}`, icon: "💰", color: "#00ff88" },
          { label: "Platform Fees (15%)", value: `$${(hourlySummary?.platformFees ?? 0).toFixed(2)}`, icon: "📊", color: "#ffcc00" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "20px",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
        {(["warroom", "pipeline", "director", "revenue"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
              background: activeTab === tab ? "linear-gradient(135deg, #7c3aed, #db2777)" : "transparent",
              color: activeTab === tab ? "#fff" : "#888",
            }}
          >
            {tab === "warroom" ? "Same-Day War Room" : tab === "pipeline" ? "Outreach Pipeline" : tab === "director" ? "Automated Director" : "Revenue Reports"}
          </button>
        ))}
      </div>


      {/* ── Tab: Same-Day Acquisition War Room ── */}
      {activeTab === "warroom" && (
        <div>
          <div style={{
            background: acquisitionLiveEnabled ? "rgba(255,204,0,0.10)" : "rgba(0,255,136,0.08)",
            border: `1px solid ${acquisitionLiveEnabled ? "rgba(255,204,0,0.35)" : "rgba(0,255,136,0.28)"}`,
            borderRadius: 14,
            padding: 18,
            marginBottom: 18,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ maxWidth: 860 }}>
                <div style={{ fontSize: 12, color: acquisitionLiveEnabled ? "#ffcc00" : "#00ff88", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                  {acquisitionLiveEnabled ? "Live-send capable: verify proof before claiming acquisition" : "Approval-gated: queued work is not counted as contacted"}
                </div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 850 }}>Same-Day Acquisition War Room</h2>
                <p style={{ margin: "8px 0 0", color: "#aaa", lineHeight: 1.6, fontSize: 14 }}>
                  This panel separates real acquisition from generated copy. A lead only counts as contacted when the proof ledger shows a delivery id, relay handoff, or manual-send confirmation tied to that lead and tracking link.
                </p>
              </div>
              <button
                onClick={refreshAcquisitionWarRoom}
                style={{ height: 42, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontWeight: 700 }}
              >
                Refresh proof
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Total leads", value: acquisitionSummary.total_leads ?? acquisitionLeads.length, color: "#7c3aed" },
              { label: "Hot leads", value: acquisitionSummary.hot_leads ?? acquisitionLeads.filter(l => l.priority_band === "hot").length, color: "#db2777" },
              { label: "Queued actions", value: acquisitionActions.filter(a => a.status === "queued" || a.status === "pending").length, color: "#ffcc00" },
              { label: "Contacted w/proof", value: acquisitionSummary.contacted ?? acquisitionActions.filter(a => a.status === "sent" && (a.external_message_id || a.proof)).length, color: "#00ff88" },
              { label: "Human handoffs", value: acquisitionSummary.handoff_required ?? acquisitionHandoffs.length, color: "#60a5fa" },
            ].map(metric => (
              <div key={metric.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 26, fontWeight: 850, color: metric.color }}>{metric.value ?? 0}</div>
                <div style={{ fontSize: 11, color: "#777", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{metric.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 16, marginBottom: 18 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>Today’s execution controls</h3>
              <p style={{ margin: "0 0 16px", color: "#999", fontSize: 13, lineHeight: 1.6 }}>
                Run test mode first to source and queue without pretending messages were delivered. Manual mode still obeys backend approval gates and will surface handoffs when direct sending is unavailable.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={handleBootstrapAcquisition} disabled={acquisitionBusy} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: acquisitionBusy ? "not-allowed" : "pointer", fontWeight: 750 }}>
                  Verify schema
                </button>
                <button onClick={() => handleRunAcquisition("test")} disabled={acquisitionBusy} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: acquisitionBusy ? "#333" : "linear-gradient(135deg, #7c3aed, #db2777)", color: "#fff", cursor: acquisitionBusy ? "not-allowed" : "pointer", fontWeight: 750 }}>
                  Run test sweep
                </button>
                <button onClick={() => handleRunAcquisition("manual")} disabled={acquisitionBusy} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(0,255,136,0.32)", background: acquisitionBusy ? "#333" : "rgba(0,255,136,0.10)", color: "#a7f3d0", cursor: acquisitionBusy ? "not-allowed" : "pointer", fontWeight: 750 }}>
                  Run manual sweep
                </button>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>Proof state</h3>
              <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
                <div>Mode: <strong style={{ color: acquisitionLiveEnabled ? "#ffcc00" : "#00ff88" }}>{acquisitionLiveEnabled ? "live capable" : "approval gated"}</strong></div>
                <div>Last run: <strong style={{ color: "#fff" }}>{acquisitionRuns[0]?.started_at || acquisitionTelemetry[0]?.created_at || "not recorded"}</strong></div>
                <div>Proof events: <strong style={{ color: "#fff" }}>{acquisitionTelemetry.length}</strong></div>
                <div>API status: <strong style={{ color: vaultxBoardQuery.error ? "#ff6b6b" : "#00ff88" }}>{vaultxBoardQuery.error ? vaultxBoardQuery.error.message : "responding"}</strong></div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(340px, 0.85fr)", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, overflow: "hidden" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Lead board: act today, count only proof</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {acquisitionLeads.slice(0, 12).map((lead) => (
                  <div key={lead.id || lead.uuid || `${lead.platform}-${lead.handle}`} style={{ display: "grid", gridTemplateColumns: "1.1fr 0.55fr 0.55fr 1fr", gap: 12, alignItems: "center", padding: "12px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>@{lead.handle}</div>
                      <div style={{ color: "#777", fontSize: 12 }}>{lead.platform} · {lead.source || lead.niche || "sourced"}</div>
                    </div>
                    <div style={{ color: SCORE_COLOR(Number(lead.score || 0)), fontWeight: 800 }}>{lead.priority_band || "unscored"} · {Number(lead.score || 0)}</div>
                    <div style={{ color: lead.status === "contacted" ? "#00ff88" : lead.handoff_required ? "#ffcc00" : "#aaa", fontSize: 12, fontWeight: 750 }}>{lead.status || "queued"}</div>
                    <div style={{ color: "#aaa", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.handoff_reason || lead.cta_url || "next action pending"}</div>
                  </div>
                ))}
                {acquisitionLeads.length === 0 && (
                  <div style={{ color: "#777", padding: 18, textAlign: "center", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10 }}>
                    No acquisition leads are visible yet. Verify schema, then run a test sweep to source and score today’s prospects.
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Recent outbound actions</h3>
              <div style={{ display: "grid", gap: 10, maxHeight: 520, overflowY: "auto" }}>
                {acquisitionActions.slice(0, 12).map((action) => (
                  <div key={action.id || action.uuid} style={{ padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <strong>@{action.handle}</strong>
                      <span style={{ color: action.status === "sent" ? "#00ff88" : action.status === "failed" ? "#ff6b6b" : "#ffcc00", fontSize: 12, fontWeight: 800 }}>{action.status}</span>
                    </div>
                    <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>{action.channel} · {action.stage} · attempts {action.attempt_count ?? 0}</div>
                    <div style={{ color: "#aaa", fontSize: 12, lineHeight: 1.5 }}>{action.error_message || action.external_message_id || action.cta_url || "No external delivery proof attached yet."}</div>
                  </div>
                ))}
                {acquisitionActions.length === 0 && (
                  <div style={{ color: "#777", padding: 18, textAlign: "center", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10 }}>
                    No outbound actions yet. Generated leads will appear here with their send status and proof fields.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Pipeline ── */}
      {activeTab === "pipeline" && (
        <div>
          {/* Action Bar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <button
              onClick={handleScanAndQueue}
              disabled={isScanning}
              style={{
                padding: "12px 24px",
                borderRadius: 10,
                border: "none",
                cursor: isScanning ? "not-allowed" : "pointer",
                background: isScanning ? "#333" : "linear-gradient(135deg, #7c3aed, #db2777)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {isScanning ? "⏳ Scanning..." : "🚀 Scan & Queue 50 Outreach Messages"}
            </button>
            <div style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: "#888",
              display: "flex",
              alignItems: "center",
            }}>
              {selectedCreators.length > 0
                ? `${selectedCreators.length} creators found — ${selectedCreators.filter(c => c.score >= 70).length} high-intent`
                : "Click Scan to find and queue today's 50 outreach targets"}
            </div>
          </div>

          {/* Creator Cards */}
          {selectedCreators.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {selectedCreators.slice(0, 20).map((creator, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 20,
                  position: "relative",
                }}>
                  {/* Score Badge */}
                  <div style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: SCORE_COLOR(creator.score || 0),
                    color: "#000",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    {creator.score || 0}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${PLATFORM_COLORS[creator.platforms?.[0]] || "#7c3aed"}, #db2777)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 800,
                    }}>
                      {(creator.display_name || creator.handle || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>@{creator.handle}</div>
                      <div style={{ fontSize: 12, color: PLATFORM_COLORS[creator.platforms?.[0]] || "#888" }}>
                        {creator.platforms?.[0] || "twitter"} · {(creator.followers || 0).toLocaleString()} followers
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12, lineHeight: 1.5 }}>
                    {creator.bio || "No bio available"}
                  </div>

                  <div style={{ fontSize: 11, color: "#666", marginBottom: 16 }}>
                    Recent: "{creator.recent_post || "—"}"
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        setReplyModal({ handle: creator.handle, message: creator.message || "" });
                        setReplyHistory([]);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: 8,
                        border: "1px solid rgba(124,58,237,0.4)",
                        background: "rgba(124,58,237,0.1)",
                        color: "#c4b5fd",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      💬 Chat
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: 8,
                        border: "1px solid rgba(219,39,119,0.4)",
                        background: "rgba(219,39,119,0.1)",
                        color: "#f9a8d4",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      📨 View Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Automated Director ── */}
      {activeTab === "director" && (
        <div>
          {/* Credit Status */}
          <div style={{
            background: creditCheck?.hasCredits ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)",
            border: `1px solid ${creditCheck?.hasCredits ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`,
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>{creditCheck?.hasCredits ? "✅" : "❌"}</span>
            <div>
              <div style={{ fontWeight: 700, color: creditCheck?.hasCredits ? "#00ff88" : "#ff4444" }}>
                Replicate: {creditCheck?.hasCredits ? `Active — @${creditCheck.username}` : "No Credits / Not Configured"}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {creditCheck?.error || (creditCheck?.hasCredits ? "All 3 models ready: Motion (Kling 2.1) · Style (Flux) · Enhance (GFPGAN)" : "Add REPLICATE_API_TOKEN to VPS .env to activate")}
              </div>
            </div>
          </div>

          {/* Pipeline Models */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Model A: Motion", model: "Kling 2.1", desc: "Cinematic slow motion, 5s video from still image", icon: "🎬", color: "#7c3aed" },
              { label: "Model B: Style", model: "Flux 1.1 Pro", desc: "Desire-Grade color/LUT — 5 signature looks", icon: "🎨", color: "#db2777" },
              { label: "Model C: Enhance", model: "GFPGAN + Real-ESRGAN", desc: "2x facial & texture enhancement", icon: "✨", color: "#00ff88" },
            ].map(m => (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${m.color}33`,
                borderRadius: 12,
                padding: 20,
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, color: m.color, fontSize: 14 }}>{m.label}</div>
                <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>{m.model}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>{m.desc}</div>
              </div>
            ))}
          </div>

          {/* Run Pipeline */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 24,
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Run Full Pipeline</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <input
                value={directorImageUrl}
                onChange={e => setDirectorImageUrl(e.target.value)}
                placeholder="Creator image URL (https://...)"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
              <select
                value={directorStyle}
                onChange={e => setDirectorStyle(e.target.value as any)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <option value="desire">Desire Grade</option>
                <option value="velvet">Velvet</option>
                <option value="sunrise">Sunrise</option>
                <option value="midnight">Midnight</option>
                <option value="natural">Natural</option>
              </select>
            </div>
            <button
              onClick={handleRunDirector}
              disabled={runPipeline.isPending || !creditCheck?.hasCredits}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 10,
                border: "none",
                cursor: runPipeline.isPending || !creditCheck?.hasCredits ? "not-allowed" : "pointer",
                background: runPipeline.isPending || !creditCheck?.hasCredits
                  ? "#333"
                  : "linear-gradient(135deg, #7c3aed, #db2777)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {runPipeline.isPending
                ? "⏳ Processing: Enhance → Style → Motion..."
                : !creditCheck?.hasCredits
                ? "❌ Replicate Credits Required"
                : "🎬 Run Full Pipeline (Enhance → Style → Motion)"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Revenue Reports ── */}
      {activeTab === "revenue" && (
        <div>
          {/* Pipeline Health */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Pipeline Health</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {pipelineHealth?.checks && Object.entries(pipelineHealth.checks).map(([key, ok]) => (
                <div key={key} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: ok ? "rgba(0,255,136,0.06)" : "rgba(255,68,68,0.06)",
                  border: `1px solid ${ok ? "rgba(0,255,136,0.2)" : "rgba(255,68,68,0.2)"}`,
                  borderRadius: 8,
                }}>
                  {statusDot(ok as boolean)}
                  <span style={{ fontSize: 13, textTransform: "capitalize" }}>
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
              ))}
            </div>
            {pipelineHealth?.errors && (
              <div style={{ marginTop: 12, padding: 12, background: "rgba(255,68,68,0.08)", borderRadius: 8, fontSize: 12, color: "#ff8888", fontFamily: "monospace" }}>
                {Object.entries(pipelineHealth.errors).map(([k, v]) => (
                  <div key={k}>[{k}] {v as string}</div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue Breakdown */}
          {revenueBreakdown && (
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 20,
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Today's Revenue Breakdown</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Subscriptions", value: revenueBreakdown.breakdown.subscriptions, color: "#7c3aed" },
                  { label: "PPV Purchases", value: revenueBreakdown.breakdown.ppv, color: "#db2777" },
                  { label: "Tips", value: revenueBreakdown.breakdown.tips, color: "#00ff88" },
                  { label: "Custom Requests", value: revenueBreakdown.breakdown.customRequests, color: "#ffcc00" },
                  { label: "Active Creators", value: revenueBreakdown.breakdown.activeCreators, color: "#60a5fa", prefix: "" },
                  { label: "New Subscribers", value: revenueBreakdown.breakdown.newSubscribers, color: "#f472b6", prefix: "" },
                ].map(item => (
                  <div key={item.label} style={{
                    padding: "16px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    border: `1px solid ${item.color}22`,
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>
                      {item.prefix !== "" ? "$" : ""}{typeof item.value === "number" ? item.value.toFixed(item.prefix !== "" ? 2 : 0) : item.value}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 16,
                padding: "16px",
                background: "rgba(0,255,136,0.06)",
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Total Revenue</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#00ff88" }}>
                    ${revenueBreakdown.breakdown.total.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Platform Fees (15%)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#ffcc00" }}>
                    ${revenueBreakdown.breakdown.platformFees.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>Creator Earnings (85%)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#c4b5fd" }}>
                    ${revenueBreakdown.breakdown.creatorEarnings.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reply Modal ── */}
      {replyModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 24,
        }}>
          <div style={{
            background: "#0d0d1a",
            border: "1px solid rgba(124,58,237,0.4)",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 560,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Chat — @{replyModal.handle}</h3>
              <button
                onClick={() => { setReplyModal(null); setReplyHistory([]); }}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}
              >×</button>
            </div>

            {/* Conversation */}
            <div style={{ height: 300, overflowY: "auto", marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {replyHistory.length === 0 && (
                <div style={{ color: "#666", fontSize: 13, textAlign: "center", marginTop: 80 }}>
                  Type a creator's reply to generate an AI response that closes the deal
                </div>
              )}
              {replyHistory.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: msg.role === "user" ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  {msg.content}
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={replyInput}
                onChange={e => setReplyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreatorReply()}
                placeholder="Enter creator's reply..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 13,
                }}
              />
              <button
                onClick={handleCreatorReply}
                disabled={handleReply.isPending}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {handleReply.isPending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
