# Backend AI Agent Challenge Patch Proof — 2026-05-20

This note records the backend fixes made after the end-to-end feature contract showed that payment gating alone was not enough. The patched backend now supports a real acquisition-to-checkout path while refusing to let unrelated, test, manual, or agent-estimated activity mutate live AI Agent Challenge revenue.

## What changed

| Lane | File | Result |
|---|---|---|
| Live-payment proof gate | `server/_core/stripeWebhook.ts` | AI Agent Challenge revenue is credited only when Stripe metadata explicitly contains `type=ai_agent_challenge_purchase` and `challengeRevenueEligible=true`. Generic Stripe checkout, tips, donations, subscriptions, charges, and payment intents no longer automatically count as challenge revenue. |
| Duplicate prevention | `server/routers/challengeAutomationRouter.ts` and `server/_core/stripeWebhook.ts` | New challenge checkout sessions set `payment_intent_data.metadata.challengeCredited=via_checkout_session`; the payment-intent webhook branch refuses to double-credit those checkout-backed payments. |
| Public checkout creation | `server/routers/challengeAutomationRouter.ts` | Added `createChallengeCheckout` as a public procedure. It creates a Stripe Checkout Session for one of three fixed AI Agent Challenge offers and attaches live-revenue metadata required by the webhook proof gate. |
| Active challenge binding | `server/routers/challengeAutomationRouter.ts` | Checkout creation looks up the active `empire_challenges` row and binds the payment metadata to that challenge ID. If no active challenge exists, checkout refuses instead of creating unassigned revenue. |
| Acquisition distribution destination | `server/services/telegramMoneyLoop.ts` | Telegram money-loop drops now support explicit `destinationUrl`, `ctaLabel`, and `vipUrl`, rather than forcing every tracked click to generic `/vaultx`. |
| Challenge-specific Telegram CTA | `server/routers/challengeAutomationRouter.ts` | The VaultX money-drop agent now points traffic at `/ai-agent-challenge?offer=vaultx-agent-revenue-pack&source=telegram_drop` with a challenge CTA. |

## Verification run

| Check | Command / artifact | Result |
|---|---|---|
| Direct mutation scan | `ops/current_session/backend_challenge_patch_scan_20260520.txt` | Only the centralized `server/challengePaymentHook.ts` writes `empire_challenge_transactions` and updates `empire_challenges.current_revenue`. |
| Challenge metadata scan | `ops/current_session/backend_challenge_patch_scan_20260520.txt` | New checkout metadata and webhook proof filters are present: `ai_agent_challenge_purchase`, `challengeRevenueEligible`, `createChallengeCheckout`, and `stripe_ai_agent_challenge_*`. |
| Server bundle build | `pnpm build:server` saved to `ops/current_session/server_build_after_challenge_backend_patch_20260520.txt` | Passed. `dist/index.js` built successfully. |
| Full TypeScript check | `pnpm check` saved to `ops/current_session/typecheck_after_backend_challenge_patch_20260520.txt` | Still fails on unrelated pre-existing client/server errors, plus the two webhook errors introduced during patching were corrected before the successful server build. |

## Current truth

The backend is now capable of creating a real AI Agent Challenge checkout session and crediting revenue only after a live Stripe webhook proves the payment belongs to the challenge. This does not yet prove the frontend user path is complete; the next phase must wire and verify the public offer page, CTA state, checkout button, success/cancel states, and operator dashboard labels.
