# Acquisition Owner Autopilot Design — Plain English

The goal is not to make the owner approve every message. The goal is to make the owner approve the **rules of the machine**, then let the platform work inside those rules.

## What the platform should do after this upgrade

The acquisition engine should be able to run in three clear states.

| State | What it means for the owner | What the platform is allowed to do |
|---|---|---|
| **Proof-only mode** | The system can scout, score, write, and queue, but it will not send live outreach. | It creates proof and shows what would have happened. |
| **Guarded autopilot** | The owner-approved strategy is active. The platform can send safe outreach without asking every time. | It sends only through approved channels, only to leads above the approved score, only for approved stages, and only within the daily cap. |
| **Escalation mode** | The system found a risk, a high-value close moment, or an unsupported delivery path. | It pauses that specific item and explains exactly why it needs special handling. |

## What counts as safe autopilot

A message should be allowed to move without owner interruption only when all of these are true: the lead score meets the approved threshold, the lead has no blocked-risk terms, the outreach stage is approved, the channel is approved, a real delivery path exists, the daily send cap has not been hit, and the message passes the existing CreatorVault quality gate.

## What still should interrupt the owner

The platform should interrupt only for things that actually deserve attention: blocked or age-risk signals, missing delivery credentials, unsupported channels that cannot be automatically delivered, failed sends after retries, positive replies that are ready for onboarding or payment close, or actions that would exceed the approved daily cap.

## Owner-facing explanation standard

After every run, the platform should explain itself like an operator, not a developer. It should say what happened, what was sent, what was queued, what was blocked, what can happen next, and what moved closer to revenue.

## Implementation direction

The service needs a stored `ownerAutopilot` policy inside the acquisition config. The dispatch logic should treat this policy as standing approval when the action is inside guardrails. The command center should show the platform state in plain language: **Proof-only**, **Guarded autopilot**, or **Escalation needed**.
