# Task 2 — Persona Identity Vault and Chained Frame Continuity

## Current task card

- **Branch:** `feat/persona-vault-chained-continuity`; base `ccba8cd56f887d041311d4f37d3ec912fd57322d` (completed Task 1).
- **Implementation:** requested backend/schema services and protected procedures implemented and locally validated.
- **Creator outcome:** an owned, consented identity source and immutable multi-shot request produce durable segment records; each completed segment's exact decoded terminal frame becomes the next segment's starting image, with inherited camera/momentum metadata.
- **Creator-facing proof state:** **ready for proof; not yet proven**. No real KingCam/persona generation, watched transition comparison, or owner acceptance occurred.
- **Authority boundary:** no production migration, paid render, branch push, merge, PR, or deployment was performed. External provider/financial spending was **$0**. Synthetic FFmpeg clips and localhost provider contract fixtures are not real-persona evidence.

## Implementation inventory

| Owner | Implemented responsibility |
|---|---|
| `drizzle/schema-persona-vaults.ts` and additive migration `0025` | `persona_vaults`, `persona_assets`, `video_generation_chains`, `video_chain_segments`; owner FKs, unique idempotency/order/render IDs, immutable snapshots, start/end/terminal checksums, grants, leases, actual media evidence and failure states. |
| `server/db.ts` | Strict typed Persona Vault database/transaction/native SQL facades; existing payout implementation preserved. |
| `personaVaultContracts.ts` / `personaVaultService.ts` | Consent/ownership and HTTPS validation, owned-source byte pinning, persona create/get/update with optimistic versions, frozen identity/wardrobe/accessory/LoRA/voice provenance, idempotent multi-shot creation and aggregated status. |
| `personaContinuityProviderContract.ts` / `personaVideoProvider.ts` | Exact supported first/last-frame API fields, quote validation without invented fallback prices, governed draft recovery, owner approval, one-use permits, read-only polling/receipt reconciliation and unused-approval compensation. |
| `personaContinuitySubmissionGuard.ts` | Bound creator/shot/request/output count, active grant and fenced worker token, exact predecessor handoff, physical start/tail frame rehash and framing inspection, final authorization/lease recheck. |
| `videoChainMedia.ts` | Bounded HTTPS/DNS-pinned ingestion, SSRF/redirect/process safeguards, native video validation, exact last decoded frame extraction, atomic immutable MP4/PNG persistence, checksums and staging cleanup. |
| `videoChainedContinuity.ts` | Sequential leased lifecycle, heartbeat, frame/camera handoff, read-only/native recovery, uncertainty quarantine, preserved completed predecessors, explicit bounded new attempts. |
| `personaContinuityWorker.ts` / server entrypoint | Application-native durable queue/restart processing, disabled by default and behind both old and new autorun gates. |
| `personaVaultRouter.ts` / canonical `server/routers.ts` | Creator-protected tRPC/Express mount as `personaVault`; owner-only paid authorization and receipt reconciliation. |
| `governedPolloService.ts` | Narrow new-mode extension to the existing provider owner; preserved freeze, connection-owned global budget locks, approved-job concurrency reservation, technical ingestion without fake quality approval/budget release, unused-approval compensation. |

The required persona profile fields belong to `persona_vaults`; `persona_assets` normalizes owned-source references/provenance rather than duplicating mutable profile fields. Composite FKs prevent persona/chain owner mismatches and historical records are not cascaded away. Legacy `media_assets` ownership is checked through parameterized SQL at ingestion; this task does not introduce a collateral schema migration of that table.

**Dialect:** the real checked-out backend uses Drizzle `mysql-core`/`mysql2`. The additive migration matches that owner and was applied only to a disposable MariaDB 10.11 database. PostgreSQL/Supabase migration was not silently attempted or falsely claimed.

## Protected procedures

Requested: `personaVault.createPersona`, `getPersona`, `updatePersona`, `startVideoChain`, `getVideoChainStatus`.

Protective additions:

- `approveVideoChain`: existing owners 6/33 approve the exact request hash, credit ceiling, bounded 1–30 minute window, remaining maximum outputs and reason.
- `retryVideoChain`: explicit recovery of the expected failed segment; successful predecessors remain intact; any new paid candidate requires a fresh grant.
- `reconcileVideoChainSegment`: owner-only read-only receipt verification against the original complete provider request; never issues a generation request.

Creator procedures derive ownership from authenticated context, not a client-supplied creator ID. Status returns duration-weighted progress, per-segment real stream URLs and errors, owner-grant/recovery indicators, and explicitly separates render completion from owner acceptance.

## Exact lifecycle and recovery

1. Persist the immutable persona/shot snapshot and idempotency identity before a provider job exists.
2. Acquire a row-locked, fenced and renewable chain lease.
3. Create/recover one governed request per segment/attempt using the existing quote, approval, budget, freeze and single-use permit owner.
4. Poll the original task read-only, ingest its actual MP4 within byte/dimension/duration/time bounds, and count decoded frames with `ffprobe -count_frames`.
5. Decode with FFmpeg and select **presentation-order frame `n = frameCount - 1`**, not an approximate seek or last keyframe.
6. Atomically publish unchanged video bytes and the decoded PNG; persist actual media evidence and checksums.
7. In a fenced transaction, set Segment N+1's start URL/SHA to Segment N's extracted terminal frame and inherit camera/momentum; only then may the next generation begin.

Technical ingestion releases render concurrency, not spent-credit reservations and not identity/aesthetic acceptance. Approved jobs reserve concurrency before submission. Global budget decisions use a stable connection-owned lock. Unused approvals can be compensated only by an atomic approved-state/no-submission check and an idempotent ledger release; queued/submitted/uncertain requests are not falsely treated as uncharged.

Read-only quote/poll and native download/storage/extraction failures receive bounded backoff with the same render ID. Definitive provider failure closes the grant and stops progression; explicit recovery and fresh approval precede a replacement candidate. An uncertain response/process crash is quarantined: the documented provider contract does not establish idempotency-key replay/search, and **absence of a receipt is not proof of no charge**. Verified original receipts permit recovery without a new generation; otherwise the hold requires owner/provider coordination. There is no blind replay or invented no-charge conclusion.

Native safeguards include credential-free HTTPS, public-IP DNS pinning and redirect revalidation, rejection of private/link-local/loopback/special-use addresses, bounded streaming, subprocess limits, local-only FFmpeg protocols, format/UUID/regular-file checks, atomic immutable publication and staging cleanup. Physical start/tail/predecessor frames are revalidated at submission; the grant/lease and emergency freeze are rechecked after inspection.

## Honest provider and quality limits

- Stored LoRA/voice IDs are immutable provenance, **not falsely claimed active model parameters**. This image-to-video contract does not accept custom LoRA/voice fields; this task neither trains LoRAs nor synthesizes speech. Generated audio is disabled.
- Supported `image`/`imageTail` fields are used exactly. Camera/momentum is conveyed through the supported prompt; planned movement is not measured optical flow. FPS/aspect are checked against real media rather than silently cropped/interpolated.
- The account-specific estimate/generation routes were **not exercised with real credentials**. Public documentation and local contract tests do not establish their availability for this account; unavailable/incomplete quotes fail closed with no guessed price or fallback render.
- Mechanical request integrity and exact frame handoff are enforced. Perfect generated appearance and perceived seamlessness remain probabilistic outcomes requiring a bounded real-persona run, watched review and explicit acceptance. `complete` does not mean identity/quality accepted.

## Verified validation

| Gate | Final result |
|---|---|
| `pnpm check:persona-continuity` | **Passed:** zero strict/noImplicitAny diagnostics across all 18 modified/new TS files. 40 untouched dependency strict diagnostics are disclosed, not suppressed. |
| TS AST audit | **Passed:** zero added explicit `any` types and zero added TS suppressions across those files; existing legacy permissive code is not falsely claimed removed. |
| `pnpm test:persona-continuity` + isolated local DB | **54/54 passed**, no integration skips. |
| Task 1 `pnpm test:stripe-payouts` local regression | **58/58 passed**. |
| `pnpm build:server` | **Passed:** actual server bundle built, not started/deployed. |
| Normal `pnpm check` | Still red on the same **8 pre-existing diagnostics**, exactly equal to branch base. |
| Whole repository suite, credentials disabled/no application DB | 355 tests: **233 passed, 18 failed assertions, 104 pending/skipped**; also 8 suite/setup failure identities. Exact assertion/setup failure identities match untouched base: **zero new failures**. Dedicated local integration proof runs separately. |
| Migration/constraints | Additive migration applied only to `creatorvault_persona_test`; real SQL exercises owner FKs and unique constraints. |
| Diff/scope | Whitespace and exact `persona-vault-chained-continuity` allowlist checked before commit. |

Coverage includes consent/HTTPS/model limits, partial/optimistic updates, canonical hashes, frozen profiles, original image bytes, real B-frame terminal-pixel equality, native framing/streaming, SSRF, replay and worker/cross-chain concurrency, owned tails and physical substitution rejection, quote ceilings/missing quotes, owner freeze/grants, exact frame/SHA/momentum handoff, poll/native recovery, definitive failure/reapproval, uncertain receipt recovery, persisted-job restart recovery, protected tRPC, FK/unique checks, and idempotent unused approval compensation.

## Before live proof or release

1. Review the exact patch. No production action or branch push is implied.
2. Obtain production-change authority, verify actual schema/migration history, and apply the additive migration through the approved migration owner.
3. Verify `ffmpeg`/`ffprobe`, durable disk capacity, and served uploads mapping. `CREATORVAULT_PERSONA_UPLOADS_ROOT`, if set, must match an existing served uploads root; `CREATORVAULT_PUBLIC_BASE_URL` must be its reachable HTTPS origin.
4. Leave generation disabled until explicitly authorized. Worker gates: `CREATORVAULT_PERSONA_CHAIN_AUTORUN=true` **and** existing `CREATORVAULT_GOVERNED_MEDIA_AUTORUN=enabled`. Submission additionally requires the existing governed execution/freeze gates, positive caps, configured provider key and exact active owner grant. No production switches changed here.
5. Select genuinely owned/consented imagery matching framing, approve a bounded real-persona proof chain, and review face/body/wardrobe/voice/camera/seam fidelity before acceptance. Do not call synthetic fixtures an accepted creator result.

## Authoritative sources

- [Pollo filtered OpenAPI specification](https://docs.pollo.ai/openapi-filtered.json): image-to-video request and status fields; provider URLs expire (documented up to 14 days), motivating immediate ingestion.
- [Pollo Kling Omni reference](https://docs.pollo.ai/m/kling-ai/kling-v3-omni.md): reference-to-video is a separate contract; its `refs` fields are not mixed into the first/last-frame request.
- [Kling Omni image-to-video reference](https://kling.ai/document-api/api/video/3-0-omni/image-to-video): conceptual first/last-frame distinction; no separate direct-Kling integration is claimed.

Identify the committed task with `git log -1 --format=%H -- PERSONA_VAULT_CHAINED_CONTINUITY_PROOF.md`. Exact commit identity, per-file line counts, patch and validation logs are exported separately to avoid a self-referential commit hash in this document.
