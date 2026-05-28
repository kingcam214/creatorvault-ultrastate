from pathlib import Path

router_path = Path('/home/ubuntu/creatorvault-ultrastate-clean/server/routers/telegramFunnelRouter.ts')
webhook_path = Path('/home/ubuntu/creatorvault-ultrastate-clean/server/telegram-webhook.ts')

src = router_path.read_text()

src = src.replace(
'function buildCreatorAcquisitionButtons(baseUrl: string, segment: CreatorAcquisitionSegment, trackingCode: string) {\n  const url = `${baseUrl}/vaultx?source=telegram&segment=${encodeURIComponent(segment.key)}&tc=${encodeURIComponent(trackingCode)}`;\n  return [\n    { text: `Open ${segment.keyword} intake`, url },\n    { text: "Request trailer audit", url: `${baseUrl}/media-assets?source=telegram&segment=${encodeURIComponent(segment.key)}&tc=${encodeURIComponent(trackingCode)}` },\n  ];\n}\n',
'function buildCreatorAcquisitionButtons(baseUrl: string, segment: CreatorAcquisitionSegment, trackingCode: string) {\n  const miniAppUrl = buildTelegramMiniAppUrl(baseUrl, segment, trackingCode);\n  return [\n    { text: `Open ${segment.keyword} Mini App`, url: miniAppUrl },\n    { text: "Request trailer audit", url: `${baseUrl}/media-assets?source=telegram&segment=${encodeURIComponent(segment.key)}&tc=${encodeURIComponent(trackingCode)}&package=${encodeURIComponent(segment.packageName)}` },\n  ];\n}\n\nfunction buildTelegramMiniAppUrl(baseUrl: string, segment: CreatorAcquisitionSegment, trackingCode: string): string {\n  return `${baseUrl}/vaultx?source=telegram_mini_app&segment=${encodeURIComponent(segment.key)}&tc=${encodeURIComponent(trackingCode)}&package=${encodeURIComponent(segment.packageName)}&stars=1`;\n}\n\nfunction starsForPackage(segment: CreatorAcquisitionSegment): number {\n  const stars = Math.ceil(segment.packageCents / 1.3);\n  return Math.max(1, Math.min(100000, stars));\n}\n\nasync function tgCreateStarInvoiceLink(token: string, segment: CreatorAcquisitionSegment, trackingCode: string, baseUrl: string): Promise<{ ok: boolean; invoiceLink?: string; payload: string; stars: number; error?: string }> {\n  if (!token) return { ok: false, payload: "", stars: 0, error: "Telegram bot token is not configured." };\n  const payload = `cvx_${segment.key}_${trackingCode}`.slice(0, 120);\n  const stars = starsForPackage(segment);\n  const body = {\n    title: segment.packageName.slice(0, 32),\n    description: `${segment.label}: ${segment.promise}`.slice(0, 255),\n    payload,\n    provider_token: "",\n    currency: "XTR",\n    prices: [{ label: segment.packageName.slice(0, 32), amount: stars }],\n    start_parameter: `cvx_${segment.key}_${trackingCode}`.slice(0, 64),\n    suggested_tip_amounts: [Math.max(1, Math.round(stars * 0.1)), Math.max(2, Math.round(stars * 0.25)), Math.max(3, Math.round(stars * 0.5))],\n    protect_content: true,\n    reply_markup: {\n      inline_keyboard: [[{ text: "Open VaultX Mini App", url: buildTelegramMiniAppUrl(baseUrl, segment, trackingCode) }]],\n    },\n  };\n  try {\n    const res = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {\n      method: "POST",\n      headers: { "Content-Type": "application/json" },\n      body: JSON.stringify(body),\n    });\n    const data = await res.json() as any;\n    return data.ok ? { ok: true, invoiceLink: data.result, payload, stars } : { ok: false, payload, stars, error: data.description || "Telegram createInvoiceLink failed" };\n  } catch (e: any) {\n    return { ok: false, payload, stars, error: e.message };\n  }\n}\n'
)

insert = r'''

  // ═══════════════════════════════════════════════════════════════════════════
  // TELEGRAM MINI APP + STAR PAYMENTS CONVERSION RAILS
  // ═══════════════════════════════════════════════════════════════════════════

  "miniApp.packageRails": protectedProcedure
    .input(z.object({
      baseUrl: z.string().url().optional(),
    }).optional())
    .query(async ({ input }) => {
      const baseUrl = normalizeBaseUrl(input?.baseUrl);
      return {
        success: true,
        baseUrl,
        miniAppEntry: `${baseUrl}/vaultx?source=telegram_mini_app`,
        packages: CREATOR_ACQUISITION_SEGMENTS.map((segment) => {
          const trackingCode = genTrackingCode(`mini${segment.key.replace(/_/g, "").slice(0, 6)}`);
          return {
            segment: segment.key,
            label: segment.label,
            keyword: segment.keyword,
            packageName: segment.packageName,
            packageCents: segment.packageCents,
            starPrice: starsForPackage(segment),
            miniAppUrl: buildTelegramMiniAppUrl(baseUrl, segment, trackingCode),
            trackingCode,
            checkoutPayload: `cvx_${segment.key}_${trackingCode}`.slice(0, 120),
          };
        }),
        independentSegmentsCovered: CREATOR_ACQUISITION_SEGMENTS.filter((segment) => ["indie_creator", "solo_operator", "creator_group"].includes(segment.key)).map((segment) => segment.key),
        enterpriseSegmentsCovered: CREATOR_ACQUISITION_SEGMENTS.filter((segment) => ["studio", "platform", "distributor"].includes(segment.key)).map((segment) => segment.key),
      };
    }),

  "stars.createPackageInvoice": protectedProcedure
    .input(z.object({
      segment: z.enum(["studio", "platform", "distributor", "indie_creator", "solo_operator", "creator_group"]),
      baseUrl: z.string().url().optional(),
      botRole: z.enum(["main","recruiter","engagement","monetization"]).default("monetization"),
      trackingCode: z.string().min(3).max(80).optional(),
    }))
    .mutation(async ({ input }) => {
      const segment = CREATOR_ACQUISITION_SEGMENTS.find((item) => item.key === input.segment);
      if (!segment) throw new Error("Unsupported creator segment.");
      const baseUrl = normalizeBaseUrl(input.baseUrl);
      const trackingCode = input.trackingCode || genTrackingCode(`star${segment.key.replace(/_/g, "").slice(0, 6)}`);
      const token = getBotToken(input.botRole);
      const invoice = await tgCreateStarInvoiceLink(token, segment, trackingCode, baseUrl);
      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO telegram_message_events (telegram_id, direction, message_type, message_text, tracking_code)
           VALUES (?, 'outbound', 'star_invoice_created', ?, ?)`,
          [segment.targetSegment, JSON.stringify({ segment: segment.key, packageName: segment.packageName, stars: invoice.stars, payload: invoice.payload, invoiceLink: invoice.invoiceLink || null, ok: invoice.ok, error: invoice.error || null }), trackingCode]
        );
      } finally { await db.end(); }
      return {
        success: invoice.ok,
        segment: segment.key,
        label: segment.label,
        packageName: segment.packageName,
        packageCents: segment.packageCents,
        starPrice: invoice.stars,
        invoiceLink: invoice.invoiceLink || null,
        payload: invoice.payload,
        miniAppUrl: buildTelegramMiniAppUrl(baseUrl, segment, trackingCode),
        trackingCode,
        error: invoice.error || null,
      };
    }),
'''

if '"miniApp.packageRails"' not in src:
    marker = '  // ═══════════════════════════════════════════════════════════════════════════\n  // CHANNEL MANAGEMENT\n'
    if marker not in src:
        raise SystemExit('channel management marker not found')
    src = src.replace(marker, insert + '\n' + marker)

router_path.write_text(src)

web = webhook_path.read_text()

web = web.replace(
'''    // Handle Telegram Stars successful_payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const starsAmount = payment.total_amount; // in smallest currency unit (stars = 1:1)
      const dollarEquiv = starsAmount * 0.013; // ~$0.013 per star
      try {
        const { creditChallengePayment } = await import("./challengePaymentHook");
        await creditChallengePayment(
          dollarEquiv,
          "telegram_stars",
          `Telegram Stars payment — ${starsAmount} stars from user ${update.message.from?.username || update.message.from?.id}`
        );
        console.log(`[Telegram Stars] ${starsAmount} stars (~$${dollarEquiv.toFixed(2)}) credited to challenge`);
      } catch { /* never block */ }
    }
''',
'''    // Handle Telegram Stars successful_payment with durable live proof
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const starsAmount = payment.total_amount; // Telegram Stars: XTR amount is 1:1 stars
      const dollarEquiv = starsAmount * 0.013; // operational estimate for challenge attribution only
      const userRef = String(update.message.from?.id || update.message.chat?.id || "telegram_user_unknown");
      const payload = String(payment.invoice_payload || "telegram_stars_payload_missing");
      const proofId = `telegram_stars:${payment.telegram_payment_charge_id || payload}:${userRef}`;
      try {
        await db.insert(botEvents).values({
          userId: bot.createdBy,
          channel: "telegram",
          eventType: "telegram_stars_successful_payment",
          eventData: {
            botId: bot.id,
            chatId: update.message.chat?.id,
            telegramUserId: update.message.from?.id,
            username: update.message.from?.username,
            starsAmount,
            currency: payment.currency,
            invoicePayload: payload,
            telegramPaymentChargeId: payment.telegram_payment_charge_id,
            providerPaymentChargeId: payment.provider_payment_charge_id,
            proofId,
            rawPayment: payment,
          },
          outcome: "success",
        });
      } catch (eventError) {
        console.error("[Telegram Stars] Failed to persist payment event", eventError);
      }
      try {
        const { creditChallengePayment } = await import("./challengePaymentHook");
        const credit = await creditChallengePayment(
          dollarEquiv,
          "telegram_stars",
          `Telegram Stars live payment — ${starsAmount} stars from user ${update.message.from?.username || update.message.from?.id}`,
          {
            mode: "live",
            provider: "telegram",
            proofId,
            paymentObjectId: payment.telegram_payment_charge_id || payload,
            customerRef: userRef,
            productRef: payload,
            channel: "telegram_stars",
            eventType: "successful_payment",
          }
        );
        console.log(`[Telegram Stars] ${starsAmount} stars (~$${dollarEquiv.toFixed(2)}) processed:`, credit);
      } catch (e: any) { console.error("[Telegram Stars] challenge credit failed", e?.message || e); }
    }
'''
)

web = web.replace(
'      const sendInlineMsg = async (text: string, buttons: Array<Array<{text: string; url?: string; callback_data?: string}>>) => {\n',
'      const sendInlineMsg = async (text: string, buttons: Array<Array<{text: string; url?: string; callback_data?: string; web_app?: { url: string }}>>) => {\n'
)

web = web.replace(
'''      if (command === "/unlock") {
''',
'''      if (command === "/packages" || command === "/stars") {
        const miniAppUrl = `${FRONTEND}/vaultx?source=telegram_mini_app&segment=all&stars=1&tc=tgcmd${Date.now().toString(36)}`;
        await sendInlineMsg(
          `<b>CreatorVault / VaultX package rails are open.</b>\n\nPick the lane that matches you: studio, platform, distributor, indie creator, solo operator, or creator group. Telegram Stars support is active for native Telegram checkout where the bot is configured for Stars.`,
          [
            [{ text: "Open VaultX Mini App", web_app: { url: miniAppUrl } }, { text: "Open in Browser", url: miniAppUrl }],
            [{ text: "Indie / Solo / Group", url: `${FRONTEND}/vaultx?source=telegram_mini_app&segment=indie_creator&stars=1` }, { text: "Studio / Platform", url: `${FRONTEND}/vaultx?source=telegram_mini_app&segment=studio&stars=1` }]
          ]
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (command === "/unlock") {
'''
)

webhook_path.write_text(web)
print('Patched Telegram funnel router and webhook with Mini App + Stars rails and live payment proof.')
