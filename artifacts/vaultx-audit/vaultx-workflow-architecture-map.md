# VaultX Workflow Architecture Map

This map converts the repository inventory into a concrete audit model for VaultX. The goal is not to prove that files exist; the goal is to verify whether VaultX behaves like a proprietary money system where a creator asset can move through editing, packaging, distribution, unlock, payment, follow-up, challenge credit, and analytics without leaking generic copy or unsafe automation.

## Primary VaultX money loop

| Stage | Product promise | Observed surfaces | Functional verification target |
|---|---|---|---|
| Creator setup | Creator creates a VaultX profile, subscription tiers, and linked Telegram channel. | `client/src/pages/VaultXOnboarding.tsx`, `client/src/pages/VaultX.tsx`, `trpc.vaultx.updateCreatorProfile`, `trpc.vaultx.linkChannel`, `trpc.vaultx.getLinkedChannel`. | Validate onboarding saves a usable creator profile and channel link; ensure copy explains the creator money route instead of generic setup. |
| Asset creation and enhancement | Creator turns raw media into PPV-ready drops, captions, teasers, exports, and body/scene-focused money moments. | `client/src/pages/VaultXEditor.tsx`, `client/src/pages/VaultXStudio.tsx`, `creatorVideoEditor`, `mediaCore`, `videoEnhance`, `vaultx.savePpvOutput`, `vaultx.publishToVaultX`. | Verify procedures accept safe test payloads, preserve metadata `source: vaultx`, and return usable output/history records or graceful unavailable states. |
| Drop packaging | One asset becomes teaser, price, CTA, unlock path, follow-up path, and VIP route. | `telegramMoneyLoop`, `telegramFunnelRouter`, `distributionRouter`, `VaultXDistribution.tsx`, `MESSAGING_DNA_LAW.md`, `qualityGate.ts`. | Verify Messaging DNA blocks generic filler and routes all public Telegram/WhatsApp/distribution copy through QualityGate before send/post. |
| Public distribution | VaultX pushes channel-native offers to Telegram, WhatsApp, and distribution jobs. | `TelegramMoneyHub.tsx`, `WhatsAppBotDashboard.tsx`, `WhatsAppContentGenerator.tsx`, `VaultXDistribution.tsx`, `telegramHubRouter`, `whatsappContentRouter`, `distributionRouter`. | Verify dry-run or safe mutations can create jobs/messages without live sending unless the approval gate is enabled. |
| Unlock and checkout | Fan clicks a tracked route, pays for PPV, subscription, tip, or VIP access. | `VaultXFanLibrary.tsx`, `checkoutBot.ts`, `stripeWebhook.ts`, `vaultx.purchasePpv`, `vaultx.subscribeToCreator`, `vaultx.createTipIntent`, `createCheckoutSession`. | Verify payment intent/session creation uses correct metadata, price, splits, and failure modes; do not perform real charges. |
| Fulfillment | Fan receives access, Telegram connect flow, VIP path, or content unlock after payment. | `purchasePpv`, `confirmTip`, `confirmSubscription`, `telegramStartHandler`, Stripe webhook handlers. | Verify the post-payment path records access and routes Telegram connection without duplicate or ungated messages. |
| Challenge credit | Revenue events push the $5K / AI Agent / VaultX challenge forward. | `challengePaymentHook.ts`, `stripeWebhook.ts`, `checkoutBot.processPayment`, `challengeAutomationRouter`, `VaultXChallenges.tsx`. | Verify only real payment-derived events can credit challenge progress; ensure generic/manual revenue paths cannot be mislabeled as verified VaultX agent wins. |
| Analytics and loopback | Creator sees revenue, content conversion, fan behavior, and next action. | `VaultXAnalytics.tsx`, `telegramHub.getMessageHistory`, `whatsappContent.getAnalytics`, `distribution.job.list`. | Verify dashboards consume real data where available and do not display misleading placeholder conversion metrics as product truth. |

## High-risk automation surfaces

The audit identified several areas that should be treated as high-risk because they can make VaultX feel either like a cheat-code system or like generic automation depending on execution quality.

| Surface | Risk | Required standard |
|---|---|---|
| Telegram public/broadcast helpers | Can leak raw AI output, test messages, repeated “unlock is live” phrasing, or long generic scripts into public channels. | Every public send must pass `QualityGate` and Messaging DNA, with live sends default-off unless approval proof is active. |
| WhatsApp copy and catalog messages | Can become generic sales/support copy instead of short direct-access money-route language. | WhatsApp messages must be compressed, reply-driven, and focused on the next monetizable action. |
| Challenge automation prompts | Can create fake hype or vague agent wins rather than specific proof-backed moves. | Agent copy must name the mechanism, tracked route, next action, and challenge impact. |
| Distribution jobs | Can post to channels without validating that the asset, CTA, destination, and tracking path form a complete loop. | Job creation/posting must require destination, channel lane, content safety level, and quality-gated copy. |
| Editor/export flows | Can look impressive but not connect to money if outputs do not become PPV/drop records. | Outputs should preserve VaultX metadata and offer save-to-PPV/publish-to-VaultX next steps. |
| Payment and challenge hooks | Can double-credit or credit the wrong challenge if webhook and manual process paths overlap. | Challenge credit must be idempotent or traceable to a real payment/session event. |
| Analytics | Placeholder metrics can falsely imply a working loop. | Unknown metrics must be shown as unavailable or pending instrumentation, not fabricated performance. |

## Functional check plan

The next phase should run safe, non-live verification against these paths. The checks should prioritize deterministic repository and local workflow validation first, then production-safe dry runs. No Telegram, WhatsApp, or payment write should be sent live without explicit approval.

| Check group | Safe test method | Expected outcome |
|---|---|---|
| Build and static gates | Run production build and quality governor. | No TypeScript/build failures; QualityGate/Messaging DNA/Brand DNA checks pass. |
| Messaging gate | Run sample copy through `qualityGate.ts`. | Strong VaultX/Telegram/WhatsApp/challenge samples pass; generic filler, raw scripts, test language, and repetitive unlock messages fail. |
| VaultX API shape | Inspect/execute non-mutating tRPC or route-level checks where possible. | Procedures required by UI exist and are wired; missing handlers are documented as blockers. |
| Payment safety | Verify checkout/session metadata and webhook/challenge credit code paths without charging. | Payment flows are traceable and challenge credit is not easy to spoof or duplicate. |
| Distribution safety | Validate job creation/post helper requirements and live-send locks. | Posting paths remain dry-run/default-off unless full approval env exists. |
| Analytics truthfulness | Audit dashboard metrics for placeholder or hardcoded values. | Any placeholder conversion metrics become labeled or backed by data. |
