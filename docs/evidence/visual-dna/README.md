# CreatorVault immutable visual DNA — evidence index

## Candidate state

**Locally verified; production verification is recorded separately after the exact main-push run.** Do not read this candidate record as a launch, monetization, rights, provider-output or accepted-creator-outcome claim.

Canonical visual law: [`../../CREATORVAULT_VISUAL_AND_DESIGN_DNA.md`](../../CREATORVAULT_VISUAL_AND_DESIGN_DNA.md). Full machine evidence: [`visual-dna-local-proof.json`](visual-dna-local-proof.json). Reproduce the isolated proof with `pnpm exec tsx scripts/runVisualDnaLocalProof.ts` from the repository root; it uses real native authentication, real local database records, real source upload and existing saved-draft routes, not response stubs.

The proof uses self-signed HTTPS on **127.0.0.1 only**, to exercise the **unchanged production session-cookie implementation**. Certificate trust relaxation is scoped to this disposable loopback browser/health client. Production TLS and authentication are unchanged. Certificate/private key, local database, ordinary creator, source upload and drafts are removed with the fixture. No credentials are in this evidence.

## Desktop/mobile route coverage

| Route/state | Desktop, 1440×1000 | Mobile, 390×844 |
| --- | --- | --- |
| Existing entry gate, before acknowledgement | [View](local-desktop-entry-gate-pre-acknowledgement-1440x1000.png) | [View](local-mobile-entry-gate-pre-acknowledgement-390x844.png) |
| `/`, gate acknowledged, real certified hero playing | [View](local-desktop-home-pre-upload-1440x1000.png) | [View](local-mobile-home-pre-upload-390x844.png) |
| `/login`, existing native sign-in | [View](local-desktop-login-pre-upload-1440x1000.png) | [View](local-mobile-login-pre-upload-390x844.png) |
| `/dashboard`, real isolated creator, truthful unavailable metrics | [View](local-desktop-dashboard-pre-upload-1440x1000.png) | [View](local-mobile-dashboard-pre-upload-390x844.png) |
| `/creator/video-studio`, before upload | [View](local-desktop-creator-video-studio-pre-upload-1440x1000.png) | [View](local-mobile-creator-video-studio-pre-upload-390x844.png) |
| Same studio, owned saved source selected | [View](local-desktop-creator-video-studio-selected-upload-1440x1000.png) | [View](local-mobile-creator-video-studio-selected-upload-390x844.png) |
| Same studio, real selected video detail | [View](local-desktop-creator-video-studio-selected-upload-preview-1440x1000.png) | [View](local-mobile-creator-video-studio-selected-upload-preview-390x844.png) |
| `/creator/workspace`, new owned workspace | [View](local-desktop-creator-workspace-new-1440x1000.png) | [View](local-mobile-creator-workspace-new-390x844.png) |
| Same workspace, persisted draft | [View](local-desktop-creator-workspace-saved-1440x1000.png) | [View](local-mobile-creator-workspace-saved-390x844.png) |
| `/trailer-maker?sourceAssetId=<exact owned id>`, source handoff | [View](local-desktop-trailer-maker-source-1440x1000.png) | [View](local-mobile-trailer-maker-source-390x844.png) |
| Same Trailer Maker, existing direction save | [View](local-desktop-trailer-maker-draft-1440x1000.png) | [View](local-mobile-trailer-maker-draft-390x844.png) |
| `/creator/workspace?draft=<exact owned id>&view=direction`, re-entered saved direction and local cut disabled | [View](local-desktop-creator-workspace-direction-local-cut-unavailable-1440x1000.png) | [View](local-mobile-creator-workspace-direction-local-cut-unavailable-390x844.png) |

Additional captures: [actual mobile navigation open](local-mobile-home-mobile-navigation-open-390x844.png), [real loaded reduced-motion poster](local-desktop-home-reduced-motion-1440x1000.png). Public read-only before-release references: [desktop](public-home-before-desktop-1440x1000.png), [mobile](public-home-before-mobile-390x844.png), [metadata](public-home-before.json).

## Visual acceptance applied to every capture

- Void-black baseline, original media and editorial display typography; no light-theme, generic-card-grid entry or substitute product.
- Bebas Neue for display/action impact, DM Sans for readable body/forms, Space Mono for technical labels/data. Self-hosted exact font families/weights loaded on both viewports.
- Cyan for creation and active controls; gold for owner/prestige/money semantics only. No invented earnings or completion values.
- Primary cyan controls meet the 52px height contract; mobile menu is a 44×44 tap target with a readable 20×20 icon.
- Existing native empty, disabled, error and progress states retain their actual meaning. Source preview shows the actual safe repository video, not a mock output.
- No horizontal overflow at the measured widths; final proof contains no unfiltered breaking console event or page error. A single exact dashboard-query exclusion belongs to the reduced local proof server only: its raw error is retained, the dashboard visibly reports `UNAVAILABLE`, and no fake response is supplied. The canonical production router already owns that unchanged query.
- The acknowledged homepage must contain a real-sized **playing** certified video; reduced-motion proof must contain a **loaded, visible** poster or a paused actual video, not arbitrary page divs.

## Required corrections found by real QA

1. Corrected nested `<a>` markup using Wouter's supported `asChild` composition, without changing route destinations or role gates.
2. Corrected scoped CSS specificity that previously shrank the login CTA below 52px and the mobile menu icon below its intended size.
3. Corrected the hero wrapper's `relative`/`absolute` collision, so real preserved motion fills the cinematic stage instead of collapsing to zero height.
4. Corrected the explicit disabled local-cut configuration: no enable flag, an empty flag or `0` means unavailable. Positive enablement still requires the original test-only, protected-storage checks. Nothing was encoded, generated, sold or sent.

## Production safety and rollback reference

The existing main-push self-hosted workflow remains the sole production path. It retains security tests, compiler/build gates, protected artifact boot, authoritative signing source, native login/role checks and service/log checks. This visual successor **does not rotate JWT_SECRET, reapply migrations, mutate payment/provider settings, or invoke any creative encoding**. The already-applied additive schema is inspected read-only. Existing user assets and approved campaign assets are preserved.

Starting/recovery reference: **`7b63a1e1f84c83a75b7ca135d23cadd4d58b1fcc`**. Do not force-push, manually restart PM2, automatically revert security/ownership changes, or claim production verification before the actual run and live screenshots succeed.
