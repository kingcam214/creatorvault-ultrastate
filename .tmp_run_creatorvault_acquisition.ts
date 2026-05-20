import { ensureVaultXAcquisitionSchema, getVaultXAcquisitionConfig, runVaultXAcquisitionTick, getVaultXAcquisitionBoard, getVaultXExecutionProof } from './server/services/vaultxAutonomousAcquisitionOperator.ts';
function redactedConfig(config: any) {
  return {
    enabled: config.enabled,
    checkoutBaseUrl: config.checkoutBaseUrl,
    discoveryEndpointsCount: Array.isArray(config.discoveryEndpoints) ? config.discoveryEndpoints.length : 0,
    redditSearchesCount: Array.isArray(config.redditSearches) ? config.redditSearches.length : 0,
    seedCreatorsCount: Array.isArray(config.seedCreators) ? config.seedCreators.length : 0,
    maxDiscoveryPerTick: config.maxDiscoveryPerTick,
    maxFirstTouchesPerTick: config.maxFirstTouchesPerTick,
    maxFollowUpsPerTick: config.maxFollowUpsPerTick,
    allowHttpWebhooks: config.allowHttpWebhooks,
    hasTelegramBotToken: Boolean(config.telegramBotToken),
    hasTelegramOpsChatId: Boolean(config.telegramOpsChatId),
    liveSendEnv: {
      VAULTX_ACQUISITION_LIVE_SENDS: Boolean(process.env.VAULTX_ACQUISITION_LIVE_SENDS),
      VAULTX_ACQUISITION_LIVE_APPROVED: Boolean(process.env.VAULTX_ACQUISITION_LIVE_APPROVED),
      VAULTX_ACQUISITION_APPROVAL_PROOF_ID: Boolean(process.env.VAULTX_ACQUISITION_APPROVAL_PROOF_ID),
      VAULTX_ACQUISITION_APPROVER: Boolean(process.env.VAULTX_ACQUISITION_APPROVER),
    },
  };
}
async function main() {
  await ensureVaultXAcquisitionSchema();
  const beforeConfig = await getVaultXAcquisitionConfig();
  const beforeBoard = await getVaultXAcquisitionBoard(25);
  const beforeProof = await getVaultXExecutionProof(25);
  const result = await runVaultXAcquisitionTick({ mode: 'manual', sourceLimit: 50, outreachLimit: 15, followUpLimit: 5 });
  const afterBoard = await getVaultXAcquisitionBoard(50);
  const afterProof = await getVaultXExecutionProof(50);
  console.log(JSON.stringify({
    executedAt: new Date().toISOString(),
    commit: process.env.CREATORVAULT_COMMIT || null,
    config: redactedConfig(beforeConfig),
    before: { leads: beforeBoard.leads?.length || 0, actions: beforeBoard.actions?.length || 0, handoffs: beforeBoard.handoffs?.length || 0, runs: beforeBoard.runs?.length || 0, summary: beforeProof.summary },
    runResult: result,
    after: {
      leads: afterBoard.leads?.length || 0,
      actions: afterBoard.actions?.length || 0,
      handoffs: afterBoard.handoffs?.length || 0,
      runs: afterBoard.runs?.slice(0, 5) || [],
      summary: afterProof.summary,
      recentTelemetry: afterProof.telemetry?.slice(0, 15) || [],
      recentLeads: afterBoard.leads?.slice(0, 15)?.map((l: any) => ({ id: l.id, platform: l.platform, handle: l.handle, score: l.score, band: l.priority_band, status: l.status, source: l.source, cta_url: l.cta_url })) || [],
      recentActions: afterBoard.actions?.slice(0, 15)?.map((a: any) => ({ id: a.id, lead_id: a.lead_id, platform: a.platform, handle: a.handle, stage: a.stage, channel: a.channel, status: a.status, sent_at: a.sent_at, external_message_id: a.external_message_id, error_message: a.error_message, hasProof: Boolean(a.proof), cta_url: a.cta_url })) || [],
      openHandoffs: afterBoard.handoffs?.slice(0, 10)?.map((h: any) => ({ id: h.id, lead_id: h.lead_id, platform: h.platform, handle: h.handle, severity: h.severity, reason: h.reason, status: h.status })) || [],
    }
  }, null, 2));
}
main().catch((error) => { console.error(error?.stack || error?.message || String(error)); process.exit(1); });
