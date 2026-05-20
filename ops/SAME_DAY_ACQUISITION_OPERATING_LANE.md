# Same-Day CreatorVault Acquisition Operating Lane

**Author:** Manus AI  
**Date:** 2026-05-20  
**Repository:** `kingcam214/creatorvault-ultrastate`

## Executive decision

The acquisition system must stop presenting queued rows or generated copy as acquired users. The verified repository mechanics show that CreatorVault has real components for **lead discovery, lead scoring, message generation, tracking-code creation, distribution-job persistence, Telegram channel sends, and acquisition proof logging**, but it does not have a universal, fully automatic social-DM sender. Therefore, the same-day lane is a tracked **command-and-proof system**: discover real leads, generate the first-touch copy, persist attribution, expose each action with proof, and only mark outreach as sent when a real transport or a human-confirmed send occurs.

> **Operating rule:** A lead is not “contacted” unless there is a persisted send proof, external message id, relay delivery record, or explicit manual-send confirmation tied to the lead and tracking code.

## Verified code facts

| Area | Verified mechanic | Same-day meaning |
| --- | --- | --- |
| Lead discovery | `creatorOutreach.scrapeCreators` uses live Twitter API when configured and Reddit JSON sources otherwise. `vaultxAutonomousAcquisitionOperator` also imports configured seeds, Reddit signals, HTTP endpoint leads, and recruiter profiles. | The system can discover or import real leads without using synthetic data. |
| Lead persistence | `outreach_leads` and `vaultx_creator_leads` persist handles, platforms, scores, monetization angles, CTA links, attribution codes, statuses, and timestamps. | Every same-day lead can be audited after generation. |
| Message generation | `creatorOutreach.queueDailyOutreach` creates personalized message copy and magic links. | Generated copy is ready for action, but it is not a send by itself. |
| Distribution tracking | `runCreatorClosingLoop` writes `distribution_jobs` rows with a tracking code and `https://creatorvault.live/r/{trackingCode}` URL. | The acquisition lane can attach conversion tracking to each outbound CTA. |
| Telegram channel send | `telegramCampaign`, `telegramFunnelRouter`, and `telegramMoneyLoop` call Telegram Bot API `sendMessage`, `sendVideo`, and invite-link endpoints when bot tokens and chat ids are configured. | Telegram channel/funnel sends are real when credentials and channel identities exist. |
| Creator DM limitation | Telegram DMs can only be sent to a chat id or to a reachable username/channel; `vaultxAutonomousAcquisitionOperator` explicitly falls back to an ops relay/outbox when direct credentials are missing. | The same-day dashboard must show “needs manual/relay send” instead of pretending full automation. |
| Live-send gate | `VAULTX_ACQUISITION_LIVE_SENDS_ENABLED=true`, `CREATORVAULT_OUTBOUND_APPROVED=premium-reviewed`, proof id, and reviewer are required before autonomous live sends. | Default behavior should be proof-first and dry-run-safe until approval exists. |

## Same-day path that can execute today

The path for today is to expose an **Acquisition War Room** inside the existing `/outreach` page. It should use the already registered router procedures instead of inventing new systems. The operator can run three actions in order: first, bootstrap the VaultX acquisition schema; second, run a manual acquisition tick or creator closing loop; third, review the proof board and send/copy only leads with a real delivery route.

| Step | User-facing action | System requirement | Proof requirement |
| --- | --- | --- | --- |
| 1 | Bootstrap acquisition schema | `vaultxAcquisitionOperator.bootstrap` succeeds. | Show schema-ready state and timestamp. |
| 2 | Run today’s acquisition sweep | `vaultxAcquisitionOperator.runNow({ mode: "manual" })` or `creatorOutreach.runCreatorClosingLoop` succeeds. | Show sourced count, queued count, sent count, failed count, dry-run state, and run id. |
| 3 | Review lead board | `vaultxAcquisitionOperator.getBoard` returns leads, actions, handoffs, and runs. | Show each lead’s status, channel, score, due action, CTA, and failure reason. |
| 4 | Act on reachable leads | Direct Telegram/webhook sends only when configured; otherwise show ops relay/manual copy. | Do not mark sent unless proof exists. |
| 5 | Track reply/onboarded state | `markReply` and `updateLeadStatus` update real rows. | Dashboard must show reply, handoff, and conversion counters from persisted tables. |

## Implementation requirements

The `/outreach` page currently says “50 daily outreach messages” and “Messages ready to send,” which is too easy to misread as completed outbound acquisition. The implementation must replace those claims with fact-first language: **queued**, **needs send**, **sent with proof**, **replied**, and **onboarded**. The page must surface the live-send approval state and the action proof returned by `vaultxAcquisitionOperator.getProof`.

| Required change | Why it matters |
| --- | --- |
| Add a “Same-Day Acquisition War Room” tab to `/outreach`. | Puts the real execution controls where the user already looks for acquisition. |
| Add run buttons for bootstrap, manual tick, board refresh, and proof refresh. | The user can force today’s acquisition cycle instead of waiting on vague automation. |
| Show dry-run/live approval mode clearly. | Prevents another false claim that unapproved outbound automation is live. |
| Show action-level status and external ids. | Separates generated copy from actual outbound sends. |
| Show manual-send copy blocks for leads without direct credentials. | Lets the operator act today even when platform API restrictions block bot DMs. |
| Persist a written ops audit in `ops/`. | Creates a durable paper trail for what is real, blocked, and next. |

## Deployment options

| Approach | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- |
| Same-day command dashboard in the current app | Fastest route because it reuses existing tables, router procedures, and routes. It requires a person to manually send where platform APIs do not provide a direct-send route. | No extra recurring automation cost beyond existing infrastructure. | Low; implement UI and run verification. |
| Durable background acquisition worker on a cloud computer | Stronger long-term solution because it can run at intervals, poll sources, process replies, and create proof automatically. It still cannot bypass platform DM/API rules. | No per-run agent cost once deployed, but requires persistent host setup and secrets. | Medium; requires service deployment, monitoring, and credential configuration. |

## Non-negotiable failure language

The product must not call the acquisition system “automated user acquisition” unless it can demonstrate actual sends, replies, signups, or payment conversions. Until then, it is a **tracked acquisition operator** that queues and proves work. If credentials or approvals are missing, the UI must say exactly that and provide the manual path.

## Immediate execution target

For this task, I will implement the current-app dashboard path first because it can be finished and verified today. I will not modify the existing dirty VaultX Body Cinema work unless required to restore build health; those changes are a separate partially staged/uncommitted area and should remain isolated from the acquisition fix.

## Implementation completed in this pass

The existing `/outreach` page now opens on a **Same-Day Acquisition War Room** tab. The tab calls the registered `vaultxAcquisition` procedures for `getConfig`, `getBoard`, `getProof`, `bootstrap`, and `runNow`, rather than relying on labels or placeholder counters. It exposes approval-gated mode, lead counts, hot lead counts, queued actions, contacted-with-proof counts, human handoffs, recent runs, recent telemetry, lead board rows, action status, delivery proof fields, and failure messages.

| Evidence item | Result |
| --- | --- |
| Modified page | `client/src/pages/OutreachCommandCenter.tsx` |
| Added operating audit | `ops/SAME_DAY_ACQUISITION_OPERATING_LANE.md` |
| Client build | `pnpm build:client` completed successfully with exit code `0` in `ops/acquisition_warroom_client_build_2.log` |
| Repository-wide typecheck | `pnpm check` is still blocked by pre-existing `ActivationWarRoomCommandCenter.tsx` `activationWarRoom` router typing errors, not by `OutreachCommandCenter.tsx`; filtered evidence is saved in `ops/acquisition_warroom_outreach_errors.txt` and contains no outreach-page matches. |
| Local live execution blocker | `DATABASE_URL` is missing in the sandbox, and `vaultxAutonomousAcquisitionOperator` explicitly requires it before execution. This means I could verify the client implementation here, but I cannot honestly claim a live acquisition tick was executed in this sandbox. |

## Exact operator path for today after deployment/environment is available

1. Open `/outreach`; the first visible tab is now **Same-Day War Room**.
2. Click **Verify schema**. This calls `vaultxAcquisition.bootstrap` and confirms the acquisition tables/proof ledger are available.
3. Click **Run test sweep**. This calls `vaultxAcquisition.runNow({ mode: "test", sourceLimit: 80, outreachLimit: 50, followUpLimit: 50 })` and reports `sourced`, `queued`, `sent`, `dryRun`, and `failed` from the real proof return object.
4. If credentials, database, and outbound approval are configured, click **Run manual sweep**. If live sends are not approved, the board will still show queued actions and handoffs rather than falsely counting them as contacted users.
5. Only count a lead as contacted when the action row shows `status='sent'` with an `external_message_id` or persisted `proof`, or when a human manual-send confirmation is tied back to the lead and tracking URL.
