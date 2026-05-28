from pathlib import Path

path = Path('/home/ubuntu/creatorvault-ultrastate-clean/server/routers/telegramFunnelRouter.ts')
src = path.read_text()

helper = r'''

type CreatorAcquisitionSegment = {
  key: string;
  label: string;
  targetSegment: string;
  keyword: string;
  pain: string;
  promise: string;
  packageName: string;
  packageCents: number;
  proofAngle: string;
};

const CREATOR_ACQUISITION_SEGMENTS: CreatorAcquisitionSegment[] = [
  {
    key: "studio",
    label: "Studios and production teams",
    targetSegment: "studio_producer",
    keyword: "STUDIO",
    pain: "too many trailer assets, too little launch proof, and no clean conversion attribution",
    promise: "a studio-grade VaultX trailer package with scene lineage, Telegram launch routing, and buyer attribution",
    packageName: "Studio Trailer Command Package",
    packageCents: 250000,
    proofAngle: "turn unreleased footage into a measurable launch funnel",
  },
  {
    key: "platform",
    label: "Creator platforms and marketplaces",
    targetSegment: "platform_operator",
    keyword: "PLATFORM",
    pain: "creator supply exists, but onboarding, launch proof, and retention loops are fragmented",
    promise: "CreatorVault/VaultX acquisition rails that package every creator into monetizable video-first drops",
    packageName: "Platform Supply Activation Package",
    packageCents: 500000,
    proofAngle: "convert creator inventory into tracked launches and repeat offers",
  },
  {
    key: "distributor",
    label: "Distributors, labels, agencies, and channel owners",
    targetSegment: "distribution_partner",
    keyword: "DISTRIBUTE",
    pain: "attention is scattered across channels without a premium trailer asset or revenue proof chain",
    promise: "a distribution-ready VaultX campaign with tracked Telegram drops, funnel follow-up, and conversion events",
    packageName: "Distribution Partner Revenue Package",
    packageCents: 350000,
    proofAngle: "route each release through a branded measurable acquisition path",
  },
  {
    key: "indie_creator",
    label: "Small independent creators",
    targetSegment: "indie_creator",
    keyword: "INDIE",
    pain: "small creators are underpackaged, underpriced, and invisible beside larger teams",
    promise: "a fast CreatorVault trailer, Telegram intake path, and offer stack that makes indie work look premium",
    packageName: "Indie Creator Launch Package",
    packageCents: 9900,
    proofAngle: "make the creator look funded before the audience scrolls away",
  },
  {
    key: "solo_operator",
    label: "Solo operators and founder-creators",
    targetSegment: "solo_operator",
    keyword: "SOLO",
    pain: "one person is carrying content, sales, editing, and follow-up without a command center",
    promise: "a lean VaultX package that turns one operator into a video-first acquisition machine",
    packageName: "Solo Operator Domination Package",
    packageCents: 19900,
    proofAngle: "compress offer, proof, and CTA into one trackable trailer funnel",
  },
  {
    key: "creator_group",
    label: "Small creator groups and collectives",
    targetSegment: "creator_group",
    keyword: "GROUP",
    pain: "group energy is strong but the launch story, roles, and monetization path are messy",
    promise: "a group-ready CreatorVault campaign with member proof beats, shared Telegram routing, and tracked offers",
    packageName: "Creator Group Expansion Package",
    packageCents: 29900,
    proofAngle: "package the collective as a premium media property instead of disconnected posts",
  },
];

function normalizeBaseUrl(value?: string | null): string {
  const fallback = process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "https://creatorvault.app";
  const raw = (value || fallback).trim().replace(/\/+$/, "");
  return raw.length > 0 ? raw : fallback;
}

function buildCreatorAcquisitionButtons(baseUrl: string, segment: CreatorAcquisitionSegment, trackingCode: string) {
  const url = `${baseUrl}/vaultx?source=telegram&segment=${encodeURIComponent(segment.key)}&tc=${encodeURIComponent(trackingCode)}`;
  return [
    { text: `Open ${segment.keyword} intake`, url },
    { text: "Request trailer audit", url: `${baseUrl}/media-assets?source=telegram&segment=${encodeURIComponent(segment.key)}&tc=${encodeURIComponent(trackingCode)}` },
  ];
}

function buildCreatorAcquisitionCopy(segment: CreatorAcquisitionSegment, baseUrl: string, trackingCode: string): string {
  const intakeUrl = `${baseUrl}/vaultx?source=telegram&segment=${encodeURIComponent(segment.key)}&tc=${encodeURIComponent(trackingCode)}`;
  return [
    `<b>CreatorVault / VaultX ${segment.label} acquisition lane is open.</b>`,
    `If ${segment.pain}, the next move is not another raw post. It is ${segment.promise}.`,
    `Package: <b>${segment.packageName}</b>. Proof angle: ${segment.proofAngle}.`,
    `Reply <b>${segment.keyword}</b> or open the review path: ${intakeUrl}`,
  ].join("\n\n");
}

function buildCreatorAcquisitionFunnelSteps(segment: CreatorAcquisitionSegment, baseUrl: string, trackingCode: string) {
  const buttons = buildCreatorAcquisitionButtons(baseUrl, segment, trackingCode);
  return [
    {
      stepNumber: 1,
      delayMinutes: 0,
      messageText: buildCreatorAcquisitionCopy(segment, baseUrl, trackingCode),
      inlineButtons: buttons,
    },
    {
      stepNumber: 2,
      delayMinutes: 1440,
      messageText: `<b>VaultX ${segment.label} follow-up.</b> Your ${segment.packageName} is built to convert attention into a tracked CreatorVault offer, not just views. Reply <b>${segment.keyword}</b> and the intake path stays tied to ${trackingCode}.`,
      inlineButtons: buttons,
    },
  ];
}
'''

needle = 'function genTrackingCode(prefix = "tg"): string {\n  return `${prefix}${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;\n}\n'
if 'CREATOR_ACQUISITION_SEGMENTS' not in src:
    if needle not in src:
        raise SystemExit('genTrackingCode needle not found')
    src = src.replace(needle, needle + helper)

procedure = r'''

  // ═══════════════════════════════════════════════════════════════════════════
  // ALL-SEGMENT CREATOR ACQUISITION ACTIVATION
  // ═══════════════════════════════════════════════════════════════════════════

  "acquisition.activateAllSegments": protectedProcedure
    .input(z.object({
      baseUrl: z.string().url().optional(),
      channelEntityId: z.number().optional(),
      sendNow: z.boolean().default(false),
      botRole: z.enum(["main","recruiter","engagement","monetization"]).default("recruiter"),
      refreshFunnels: z.boolean().default(true),
    }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      const baseUrl = normalizeBaseUrl(input?.baseUrl);
      const activated: any[] = [];
      try {
        const token = getBotToken(input?.botRole || "recruiter");
        for (const segment of CREATOR_ACQUISITION_SEGMENTS) {
          const trackingCode = genTrackingCode(`tg${segment.key.replace(/_/g, "").slice(0, 6)}`);
          const messageText = buildCreatorAcquisitionCopy(segment, baseUrl, trackingCode);
          const inlineButtons = buildCreatorAcquisitionButtons(baseUrl, segment, trackingCode);
          qualityGate.check(messageText, {
            surface: input?.channelEntityId ? "telegram-broadcast" : "telegram-dm",
            context: "vaultx_creator_acquisition",
            recipientKey: segment.targetSegment,
            hasActionElement: true,
            requireCreatorVaultPositioning: true,
            requireMessagingDna: true,
          });

          const [campaignResult] = await db.execute(
            `INSERT INTO telegram_campaign_deliveries
             (campaign_name, channel_entity_id, target_segment, message_text, media_url, media_type, inline_buttons, tracking_code, scheduled_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              `CreatorVault acquisition — ${segment.label}`,
              input?.channelEntityId || null,
              segment.targetSegment,
              messageText,
              null,
              "text",
              JSON.stringify(inlineButtons),
              trackingCode,
              null,
              input?.sendNow && input?.channelEntityId ? "sending" : "draft",
            ]
          ) as any;
          const campaignId = campaignResult.insertId;

          let sendResult: { ok: boolean; messageId?: number; error?: string } | null = null;
          if (input?.sendNow && input.channelEntityId) {
            const [chanResult] = await db.execute(
              "SELECT * FROM telegram_channel_entities WHERE id = ? AND is_active = 1 LIMIT 1",
              [input.channelEntityId]
            );
            const channel = rows(chanResult)[0];
            if (!channel) throw new Error("Active Telegram channel not found for all-segment acquisition send.");
            sendResult = await tgSendMessage(token, channel.telegram_chat_id, messageText, inlineButtons);
            await db.execute(
              "UPDATE telegram_campaign_deliveries SET status = ?, sent_at = CASE WHEN ? THEN NOW() ELSE sent_at END, delivered_count = ?, recipients_count = 1 WHERE id = ?",
              [sendResult.ok ? "sent" : "failed", sendResult.ok ? 1 : 0, sendResult.ok ? 1 : 0, campaignId]
            );
          }

          let funnelId: number | null = null;
          if (input?.refreshFunnels !== false) {
            const funnelName = `CreatorVault acquisition funnel — ${segment.label}`;
            const [existingFunnel] = await db.execute(
              "SELECT id FROM telegram_funnel_definitions WHERE name = ? LIMIT 1",
              [funnelName]
            );
            const existing = rows(existingFunnel)[0];
            if (existing?.id) {
              funnelId = Number(existing.id);
              await db.execute(
                "UPDATE telegram_funnel_definitions SET trigger_value = ?, target_segment = ?, is_active = 1 WHERE id = ?",
                [segment.keyword, segment.targetSegment, funnelId]
              );
            } else {
              const [funnelResult] = await db.execute(
                `INSERT INTO telegram_funnel_definitions
                 (creator_id, name, funnel_type, trigger_type, trigger_value, target_segment)
                 VALUES (?, ?, 'onboarding', 'keyword', ?, ?)`,
                [null, funnelName, segment.keyword, segment.targetSegment]
              ) as any;
              funnelId = funnelResult.insertId;
            }

            if (funnelId) {
              await db.execute("DELETE FROM telegram_funnel_steps WHERE funnel_id = ?", [funnelId]);
              for (const step of buildCreatorAcquisitionFunnelSteps(segment, baseUrl, trackingCode)) {
                await db.execute(
                  `INSERT INTO telegram_funnel_steps
                   (funnel_id, step_number, step_type, delay_minutes, message_text, media_url, media_type, inline_buttons, ppv_content_id)
                   VALUES (?, ?, 'message', ?, ?, ?, ?, ?, ?)`,
                  [funnelId, step.stepNumber, step.delayMinutes, step.messageText, null, null, JSON.stringify(step.inlineButtons), null]
                );
              }
            }
          }

          await db.execute(
            `INSERT INTO telegram_message_events (telegram_id, direction, message_type, message_text, tracking_code)
             VALUES (?, 'outbound', 'creator_acquisition_activation', ?, ?)`,
            [segment.targetSegment, messageText, trackingCode]
          );

          activated.push({
            segment: segment.key,
            label: segment.label,
            targetSegment: segment.targetSegment,
            keyword: segment.keyword,
            packageName: segment.packageName,
            packageCents: segment.packageCents,
            campaignId,
            funnelId,
            trackingCode,
            sendStatus: sendResult ? (sendResult.ok ? "sent" : "failed") : "draft_ready",
            messageId: sendResult?.messageId || null,
            error: sendResult?.error || null,
          });
        }
        return {
          success: true,
          baseUrl,
          totalSegments: activated.length,
          independentSegmentsCovered: activated.filter((item) => ["indie_creator", "solo_operator", "creator_group"].includes(item.segment)).map((item) => item.segment),
          activated,
        };
      } finally { await db.end(); }
    }),
'''

if '"acquisition.activateAllSegments"' not in src:
    marker = 'export const telegramFunnelRouter = router({\n'
    if marker not in src:
        raise SystemExit('router marker not found')
    src = src.replace(marker, marker + procedure)

path.write_text(src)
print('Patched telegramFunnelRouter.ts with all-segment acquisition activation.')
