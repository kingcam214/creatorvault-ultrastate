# Telegram Cleanup Approval Plan

## Current status

All automated Telegram posting remains **disabled by default**. The cleanup phase is intentionally non-destructive: no Telegram message deletion, edit, repost, pin, unpin, or webhook action should be executed until the owner explicitly approves the exact operation and target messages.

## Candidate messages identified from local live-run artifacts

The local telemetry artifacts identify two confirmed live outbound posts from the KingCam Clone Agent challenge flow. These are cleanup candidates because they were sent before the new premium video-first message standard, outbound quality gate, routing guard, and rate limiter were installed.

| Priority | Message ID | Timestamp UTC | Source | Tracking Code | Evidence Artifact | Proposed Action |
|---:|---:|---|---|---|---|---|
| 1 | 1084 | 2026-05-15T17:25:22.190Z | `challenge_executor_send_telegram` | `challenge_kingcam-clone-agent_mp76tzxc_2faf07` | `artifacts/challenge-runs/kingcam-clone-agent-live-telegram-1778865922191.json` | Delete or manually hide after owner approval. |
| 2 | 1083 | 2026-05-15T17:15:59.016Z | `challenge_executor_send_telegram` | `challenge_kingcam-clone-agent_mp76hvnh_09559c` | `artifacts/challenge-runs/kingcam-clone-agent-live-telegram-1778865359017.json` | Delete or manually hide after owner approval. |

The artifacts do not preserve a reliable `chat_id` value; local telemetry records `chatId: null`. Therefore, the approval step must include either the exact Telegram channel identifier/username or confirmation that the bot should use the configured production channel from environment configuration. No destructive Bot API call should be attempted until that target is confirmed.

## Approval options

| Option | What happens | Risk | Recommendation |
|---|---|---|---|
| Manual owner deletion | The owner opens Telegram and deletes message IDs `1084` and `1083` directly from the channel. | Lowest; no automation or Bot API mutation required. | **Recommended first**, because it avoids any accidental bot-side action while the emergency freeze remains active. |
| Bot-assisted deletion | After explicit approval, call Telegram `deleteMessage` for each approved `message_id` and approved channel target. | Medium; requires using the Bot API against a live channel. | Only use if manual deletion is not practical and the channel target is confirmed. |
| Leave live but supersede later | Keep the old posts visible until the homepage and real-channel preview are approved, then post one premium corrective drop. | Medium; broken content remains visible longer. | Acceptable only if deletion would disrupt channel continuity. |

## Required explicit approval wording

Before any automated cleanup action, obtain a user message equivalent to the following:

> I approve deleting Telegram messages `1084` and `1083` from channel `<exact channel id or @username>` using the configured Telegram bot. Do not send replacement content yet.

If the user approves only one message, only that one message may be acted on. If the user approves reposting or replacement content, treat that as a separate sensitive action requiring a clean preview and a second confirmation.

## Safe execution sequence after approval

| Step | Action | Gate |
|---:|---|---|
| 1 | Confirm exact channel target and approved message IDs. | Must match owner approval. |
| 2 | Keep `TELEGRAM_POSTING_ENABLED=false` and perform only the approved `deleteMessage` operation. | Deletion is not a promotional send and must not re-enable posting automation. |
| 3 | Record every response from Telegram in a cleanup proof artifact. | Required for auditability. |
| 4 | Re-run `pnpm emergency-guard`. | Confirms the outbound send freeze remains intact after cleanup. |
| 5 | Do not post replacement content until homepage and channel preview are separately approved. | Prevents relapse into unreviewed public output. |

## Non-negotiable constraints

No deletion will be attempted from this plan without explicit owner approval. No replacement public post will be sent as part of cleanup. No automation interval, live-send launcher, webhook sender, channel drop, VIP DM, invite-link creation, or campaign path should be re-enabled during cleanup.
