# VaultX Functional Check Report

Generated: 2026-05-16T05:13:47.565Z

## Baseline

| Metric | Value |
|---|---:|
| Server procedures | 93 |
| Client VaultX calls | 65 |
| Missing client procedures | 0 |
| Quality governor passed | yes |
| High-priority gaps | 0 |

## Critical Checks

| Status | Severity | Check | Detail |
|---|---|---|---|
| PASS | fail | required file exists: server/routers/vaultxRouter.ts | vaultxRouter |
| PASS | fail | required file exists: server/routers/vaultxAcquisitionOperatorRouter.ts | acquisitionRouter |
| PASS | fail | required file exists: server/services/vaultxAutonomousAcquisitionOperator.ts | acquisitionService |
| PASS | fail | required file exists: server/services/telegramMoneyLoop.ts | telegramMoneyLoop |
| PASS | fail | required file exists: server/routers/telegramFunnelRouter.ts | telegramFunnelRouter |
| PASS | fail | required file exists: server/routers/challengeAutomationRouter.ts | challengeAutomation |
| PASS | fail | required file exists: server/routers/aiChatterRouter.ts | aiChatterRouter |
| PASS | fail | required file exists: server/services/checkoutBot.ts | checkoutBot |
| PASS | fail | required file exists: server/services/creatorTools.ts | creatorTools |
| PASS | fail | required file exists: server/services/qualityGate.ts | qualityGate |
| PASS | fail | required file exists: MESSAGING_DNA_LAW.md | messagingLaw |
| PASS | fail | required file exists: BRAND_DNA_QUALITY_LAW.md | brandLaw |
| PASS | fail | VaultX router exposes setup/create/upload/revenue procedures | procedures=93 |
| PASS | fail | Client VaultX calls resolve to server procedures | all client calls matched |
| PASS | fail | QualityGate contains Messaging DNA validator | QualityGate messaging/challenge validators present |
| PASS | fail | Telegram money loop uses QualityGate before sends/logged drops | telegramMoneyLoop gated |
| PASS | fail | Telegram funnel helpers use QualityGate | telegramFunnelRouter gated |
| PASS | fail | Challenge automation prompts use Messaging DNA | challengeAutomation upgraded |
| PASS | fail | WhatsApp checkout copy uses Messaging DNA QualityGate | checkoutBot gated |
| PASS | fail | Creator tools channel generators use QualityGate | creatorTools gated |
| PASS | fail | Dedicated AI chatter router validates generated fan replies | aiChatterRouter gated |
| PASS | fail | Live Telegram reactivation env vars are not set locally | local environment keeps live sends default-off |

## Gaps Requiring Upgrade

| ID | Severity | Gap | Recommended Fix |
|---|---|---|---|
| None | none | No gaps detected | No action |

## Notes

This harness performs safe functional verification through static route/UI alignment, governance coverage checks, and local quality governor execution. It does not send Telegram, WhatsApp, payment, or email traffic.
