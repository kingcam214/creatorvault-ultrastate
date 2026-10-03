# Task 3 — In-Browser Video Studio Timeline & Beat-Matched Assembler

## Current task card

| Field | Record |
|---|---|
| **Claim** | A creator can assemble an immutable Persona Vault chain in a dedicated local timeline view, inspect persisted frame handoffs, analyze a selected audio file in-browser, snap local cut guidance to detected onsets, and preview editable CreatorVault overlays. |
| **Current status** | **Ready for proof; not yet proven.** The non-spending route and UI implementation exist, but no real creator has used an owned persona source to obtain and accept a saved master/export. |
| **Creator/source/result** | No creator-specific source, authenticated persona, terminal media stream, audio file, or final export was supplied or used during this task. The page accepts only a creator-selected local audio file and Task 2's authenticated chain records when they exist. |
| **Acceptance rule** | An authorized creator must load a real persisted chain, select owned audio, watch the cut/frame continuity and overlay treatment, retrieve a saved result where it lives, and explicitly accept or reject it. |
| **Cost ceiling / spend** | **$0.** No provider request, render authorization, media generation, production schema change, deployment, or payment action occurred. |
| **Stop rule** | The work stops at UI/code validation. No provider route or owner authorization is invoked from the timeline; real-persona proof requires a separate written permit and source record. |

## Delivered, exact ownership

- New canonical route: `/studio/video` → `client/src/pages/VideoStudioTimelinePage.tsx`.
  - Before the change, `pnpm route-owner /studio/video` returned **not found**.
  - After the change, it reports `VideoStudioTimelinePage` as the sole route owner.
  - The older `/creator/video-studio` owner remains a separate saved-source handoff screen; it was not replaced or renamed.
- `VideoStudioTimeline.tsx` provides a real multi-track timeline:
  - actual Task 2 segment card positions and `startFrameUrl` / `terminalFrameExtractedUrl` thumbnails;
  - `HTMLVideoElement` decoding with a synchronized `canvas` draw loop for preview;
  - an audio track, local scrub transport, beat markers, and order-preserving cut snapping;
  - an overlay/title track reflecting current intro, lower-third, and end-card controls.
- `audioBeatDetector.ts` decodes a creator-selected browser file using the Web Audio API, mixes PCM locally, identifies transient peaks from short-time energy novelty, and returns typed beat times. No upload or provider call is involved.
- `BrandOverlayTrack.tsx` provides actual dynamic controls for two animated SVG logo sting variants, a **NOW PLAYING** lower-third, a burgundy end-card CTA, and a configurable translucent vignette.
- The page calls Task 2's typed protected `personaVault.startVideoChain` and `personaVault.getVideoChainStatus` endpoints directly. It preserves Task 2's important boundary: creating a durable chain record is **not** a paid render; provider submission remains behind the existing owner authorization, credit, freeze, and one-use permit gates.
- The timeline’s beat cuts and overlay direction are intentionally local UI state. There is no backend timeline-edit or final-export persistence API in the requested/current contract, so the page does not falsely claim that a branded master has been saved or exported.

## Verified validation

| Gate | Result |
|---|---|
| `pnpm check:video-studio` | **Passed:** zero strict/noImplicitAny diagnostics across all 9 Task 3 source, route, test, and validation files. |
| `pnpm test:video-studio` | **Passed:** 4/4 component/unit tests covering actual track/frame markup, deterministic PCM peak detection, order-preserving snapping, and timecode formatting. |
| `pnpm build:client` | **Passed:** Vite production client bundle completed. Existing large-chunk warning remains a repository-level bundle warning, not a Task 3 failure. |
| Normal `pnpm check` | Still red on the same **8 pre-existing diagnostics** recorded before Task 3; exact error identities are unchanged. |
| Route ownership | **Passed:** `/studio/video` resolves only to `VideoStudioTimelinePage`. |
| Scope / diff | **Passed:** exact `video-studio-timeline` allowlist and `git diff --check`; no Task 3 explicit `any`, TypeScript suppression, mock function, or placeholder marker. |
| Local visual route review | The local Vite preview loaded the route and exposed the timeline, audio, overlays, composer, and read-only status controls. The repository’s pre-existing global adult-access gate covered the visual surface; it was not bypassed or falsely attested through. |

## What this does not establish

1. It does not establish real-character consistency, visual seam quality, audio correctness, or aesthetic acceptance; those require Task 2 to produce a real authorized chain and a watched source-to-result review.
2. It does not establish a final branded export, server-side editing persistence, or a saved creator master; no such requested/current backend operation exists.
3. It does not establish that a browser/user has permission to use a particular audio file, persona, or end frame. The creator must supply/own those assets and Task 2 continues enforcing persona/chain ownership.
4. It does not activate the disabled provider worker, bypass a permit, or make a provider call.
5. It does not revise the current active Product Kernel or claim that this newly available page is a proven creator workflow.

## One next allowed action

Review the committed Task 3 diff and this proof record. If the owner decides to pursue a real proof, first create the required task card with an owned/consented persona, one authorized audio source, a bounded output/credit permit, exact saved-result location, and watchable acceptance criteria; only then may the existing Task 2 authorization flow be used.
