# CreatorVault Telegram Message Standards

**Status:** emergency replacement standard for CreatorVault, VaultX, challenge, and visual-drop outbound copy. Automation remains disabled unless `TELEGRAM_POSTING_ENABLED=true` is deliberately set after approval.

## Standard

Every public Telegram post must read like a **premium video-first platform drop**, not a raw system log, static placeholder, or generic hype note. The copy should make the reader understand the asset, the motion layer, the commercial outcome, and the next step in one scan.

| Required layer | Standard | Blocked pattern |
|---|---|---|
| Visual anchor | Name the motion/product/asset world being shipped, such as AI Video Lab, product drop, apparel lookbook, creator promo, or VaultX funnel. | “New content available,” raw IDs, file names, or captions without a visual premise. |
| Outcome | State the buyer/operator outcome in practical language. | Vague claims, generic motivation, or “coming soon” placeholder copy. |
| Proof | Mention the fulfillment or tracking rail: sprint asset, checkout, reply workflow, telemetry, or campaign package. | Raw JSON, `[object Object]`, `undefined`, TODO text, or unverified metrics. |
| Conversion | Give one clear action: unlock, reply READY, open the VaultX drop, or request the next build. | Multiple confusing CTAs or passive “learn more” copy. |
| Tone | Cinematic, direct, revenue-aware, and platform-first. KingCam can appear as operator proof, but CreatorVault must remain the product story. | KingCam-only self-promo that hides the broader platform infrastructure. |

## Approved Public Post Skeleton

```text
<b>[DROP NAME] · [VISUAL / PLATFORM LANE]</b>

[One cinematic sentence describing what the viewer is about to see or unlock.]

<b>Built for:</b> [specific buyer/operator outcome].
<b>Proof rail:</b> [tracked checkout, fulfillment step, reply workflow, or campaign system].
<b>Next move:</b> [single direct CTA].

<a href="[TRACKED_URL]">[CTA LABEL]</a>
```

## Approval Rule

A message is not eligible for real-channel posting unless it passes the shared Telegram outbound guard, uses a verified media fallback when media is referenced, and has been reviewed in dry-run proof first. This standard intentionally keeps Polla AI and other generation lanes visible so the homepage and outbound drops tell the same platform story.
