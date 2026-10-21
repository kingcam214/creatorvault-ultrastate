# Body Cinema Evidence Ledger

**Ledger version:** 1.0  
**Date:** 2026-08-06  
**Rule:** A capability is not complete until it can be watched against a real creator-owned source clip, compared, and accepted using the Body Cinema Evidence Standard.

## Current Claim Status

| Claimed capability | Current status | Evidence available now | Evidence still required before acceptance |
|---|---|---|---|
| Twelve real treatment preview files exist | **Proven as packaged assets; not proven as live experience** | Fifteen MP4 files exist in `client/public/assets`; each treatment preview has a distinct SHA-256 checksum. The source route maps every treatment ID to an explicit video filename. | A screen recording of all twelve previews playing on desktop and mobile after the production release is actually live. A human treatment-match review is still required. |
| Every preview is different | **Proven only at file level** | Each treatment preview has a unique file checksum. | Side-by-side human review showing that treatments are materially different in visual language, camera movement, pacing, and payoff. Different binary files alone are not sufficient. |
| Every preview loops | **Demonstrable but unproven** | The route renders every preview with `autoPlay`, `loop`, `muted`, and `playsInline`. | A real browser recording, on desktop and mobile, showing the actual loop without a failed or frozen playback. |
| Every preview matches its treatment name | **Incomplete** | The current files are mapped to named treatments. | Human acceptance review of every preview against a treatment definition. No creator-specific result has been produced. |
| Body Cinema analyzes an uploaded source | **Demonstrable but unproven** | Browser-local perception and server evidence paths exist. The system can record source frames, timecodes, pose signals, visual diagnostics, ranked shots, and a treatment plan. | A complete screen recording using a real creator-owned video that shows strongest hook, thumbnail, scenes, body focus, treatment choice, and source-specific reason for each decision. |
| Body Cinema recommends a treatment for a reason | **Demonstrable but unproven** | The evidence service creates ranked-shot and direction data, and the route exposes a creator-facing treatment selection flow. | A real-source proof recording and creator acceptance showing why one treatment was recommended over another. |
| The Arch, Silhouette, Luxury Reveal, and VIP Tease are materially distinct from one source | **Incomplete** | Treatment-plan structures and preview demonstrations exist. | Four real output renders from the same approved creator-owned source, displayed side by side and independently accepted as materially different. |
| Body Cinema rejects duplicate or weak output | **Proven only as no-spend decision logic** | Focused tests cover output-score, treatment-compliance, body-integrity, and near-duplicate rejection rules. | Real provider outputs, including an intentional near-duplicate and a weak result, passed through a recorded review session. |
| Body Cinema creates a finished paid drop | **Incomplete** | The current workflow deliberately keeps package planning review-only. No paid provider job, checkout, campaign, publication, messaging, or automation has been executed. | An explicitly authorized bounded creator-owned run, watched from source to accepted output and reviewed before any commercial action. |
| Body Cinema outperforms CapCut, Edits, or Beatleap | **Incomplete** | No competitor test has been run. | The same legal source clip run through each workflow; side-by-side outputs, creator effort, quality review, and an independent acceptance decision. |
| Creator revenue or conversion improves | **Incomplete** | No measured commercial outcome exists. | Verified outcome data from real released drops, with attribution, time period, and comparison method. |

## Packaged Motion Asset Register

The following files have different cryptographic checksums. This proves the files are not byte-for-byte duplicates. It does **not** prove that the videos are semantically distinct treatments or that they have been watched in the live application.

| Asset | SHA-256 prefix | Current use |
|---|---:|---|
| `preview-arch.mp4` | `523f666ca42c` | The Arch demonstration |
| `preview-silhouette.mp4` | `ddc0a478f38f` | Silhouette demonstration |
| `preview-decollete.mp4` | `016ca89c0449` | Décolleté demonstration |
| `preview-mirror.mp4` | `e1837b111c68` | Mirror Moment demonstration |
| `preview-curves-360.mp4` | `8e9d70f40ec3` | 360 Curves demonstration |
| `preview-waist.mp4` | `8c54cca6dabc` | The Waist demonstration |
| `preview-abs.mp4` | `512782c19788` | Abs Drop demonstration |
| `preview-thigh.mp4` | `e72b4fde9067` | Inner Thigh demonstration |
| `preview-lower-back.mp4` | `c71524f82220` | Lower Back demonstration |
| `preview-hips.mp4` | `eb912123484c` | Hip Sway demonstration |
| `preview-legs.mp4` | `04725094cd16` | Leg Day demonstration |
| `preview-back.mp4` | `a9471fd1df71` | The Back demonstration |
| `hero-transformation.mp4` | `bcd5613c8961` | Before-and-after concept demonstration |
| `intelligence-overlay.mp4` | `683bfb6a4a07` | Source-analysis interface demonstration |
| `final-drop.mp4` | `e070eb10e33e` | Simulated finished-drop demonstration |

## What Is Not Yet Proven

No recorded proof currently shows Body Cinema analyzing a real creator-owned upload, selecting a source-specific hook or thumbnail, generating four materially different outputs from one source, passing an output-quality review, beating a competitor, or improving revenue. Those claims remain incomplete until the required evidence exists.

## 2026-10-08 — Connected native HD candidate lane (CV-VIDEO-002 / 003 / 007; CV-MISSION-006 / 007 / 008)

### Requested connected repair

The local HD proof engine is now a typed, source-bound private candidate lane on the existing `bodyCinema.lifecycle` router and `BodyDirectedDirector` component. Original body-directed planning assertions, frozen source maps, saved shot plans, legacy candidate grants and accepted-master history are **not rewritten or reinterpreted as render permission**. A separate versioned HD recipe and explicit private-review execution authorization are stored in existing owned `creation_projects.metadata_json`; ownership and source hashes are reverified before admission, registration and playback. No migration, new provider resource, publication or payment path is introduced.

- New source contracts: `shared/bodyCinemaHd.ts`.
- Pure qualification: `server/services/bodyCinemaHdBlueprint.ts`; 3–6 unique source-time shots, each at least two seconds, 10–15 seconds total. Selected focus requires at least two seconds of actual measured region support. Complete native context outside sparse pose sampling is separately authorized; expressly defective/excluded ranges remain blocked. No guessed focus or generated anatomy.
- Executor: `server/services/bodyCinemaHdRenderEngine.ts`; Lanczos HD landscape/portrait/square canvas; no digital crop; H.264 High CRF16; preserved source cadence; deterministic subtle luma texture; 48k AAC320k audio with sample-aligned cuts and 4ms anti-click edge fades; genuinely silent sources stay silent. No frame interpolation, cloud GPU or provider calls.
- Four finite local grade matrices: **Obsidian, La Reina, Golden Hour, Midnight Heat**. La Reina retains the demonstrated master curve. Other looks are restrained color/tonal adjustments, not invented source illumination. Actual same-frame 1080p grade stills were inspected for retained identity, complete head boundaries and source shadow texture. This is technical/local visual evidence, not broadcast certification or competitor superiority.
- Executor pins regular source/output descriptors, checks source hashes before/after, reserves one private output inode exclusively, decodes every output frame, verifies cadence/count/container/audio metadata, rejects almost-all-black output frames and shares a total ten-minute budget across its subprocesses. Native source floor is 720p; source duration <=60 seconds; native dimensions <=1920 pixels per side; free disk >=1 GiB, free inodes >=1000 and host free memory >=512 MiB. One database advisory worker lock; one durable attempt. Failures retain private evidence, expose no candidate and do not retry.
- Review: `client/src/components/body-cinema/BodyCinemaHdReview.tsx` mounted below the immutable saved plan. Void #0A0A0A, Bebas Neue headings, DM Sans body, Space Mono metadata inside Details. Locked focus/edit/grade/duration; ready-only protected video player. Explicit distinction between encoded HD and missing native detail. No automatic acceptance, accepted-master download, Trailer Maker handoff or publication.
- Private playback: `/api/body-cinema/lifecycle/:id/hd-candidate`; ordinary session/owner verification, exact receipt/source/recipe/artifact identity, existing HEAD and Range delivery. Legacy candidate attachment/acceptance boundaries remain unchanged.

### Evidence and validations

Baseline for this work: canonical main and live release `7077afd9260dcdd4368db4b7db8ffb6ddc05737c`; existing production runner online and idle at preflight. Only existing guarded main-push deployment is permitted. The exact parent/live pins and finite new-file scope list are synchronized for this reviewed successor; controller implementation, sessions, migrations, provider policy, database schema and general renderer safeguards remain unchanged.

The real hallway source used by the earlier HD proof is platform asset `59d425d8-65b8-41cd-abaa-f99be06871ab`, SHA-256 `be47961db996e097b0ec47d902aa6657db2cbab11df71bdaeded972455f63b7b`, 1280×720, approximately 13.073 seconds. It is **not** the different public pre-provider attestation asset `1a7fc78f-c93f-4e5c-9030-86f770e604fe` / `55fd819d…`; these identities must not be conflated.

Local checks completed during development:
- Mandatory whole-project `pnpm check`: PASS, no diagnostics after introduced test/import errors were repaired.
- Existing security, Stripe payout, Persona continuity and Video Studio strict gates: PASS. Scoped dependency warnings are not substitutes for the whole-project result.
- Existing unchanged consolidated-release strict checker: PASS (16 required files, zero diagnostics, no unsafe-type/suppression violations). An initial attempt to add app roots to this controller-only checker produced unrelated partial-program diagnostics and was withdrawn; its original implementation is retained and app changes remain covered by Video Studio + whole-project checks.
- Existing isolated consolidated regressions: 58 Stripe, 57 Persona, 27 Video Studio and 29 migration/release/tool tests PASS. Security: 48 PASS.
- Native socket-only Body Cinema harness: **138 tests PASS, zero skips**, including all four actual FFmpeg grade filters, silent/audio 1920×1080 renders, prepared-state ownership, immutable recipe/history, byte integrity and auth/playback boundary regressions. Synthetic fixture clips are labelled test-only and are not creator-quality proof.
- Local server and client production builds: PASS. Existing large client-bundle warning remains; no unrelated bundle redesign is included.
- Final total-budget/black-frame executor tests: 66 PASS, zero skips, actual audio/silent 1920×1080 exports. Final native owner/UI core checks: 27 PASS; mandatory whole-project compiler: PASS again after exact historical-plan wording was synchronized. No production candidate is created as part of test runs.
- A signed-in disposable local creator used the actual Studio UI and freshly ran MediaPipe inference on the exact hallway original; qualified, selected Face & Beauty / Face Card / La Reina, froze the existing planning record, separately prepared four HD cuts, explicitly authorized and executed exactly one native render. The saved private candidate was 1920×1080, 10.5 seconds, 252 frames at 24fps, with audio. Whole browser playback reached the end without error or corrupt frames. Under concurrent local CPU tests the first playback reported 17 dropped display frames; zero-drop playback is not claimed from that pass. Full file bytes/hash, Range206 and anonymous401 passed. Wrong-owner access returned non-disclosing404, which is valid denial; an overly strict harness assertion expected403 and stopped the later replay/mobile phase without an application security bypass. Same-candidate replay/mobile verification is being completed without another export.

### Truth and soft-launch boundary

The latest task explicitly forbids production database mutations. Therefore live verification for this release is read-only; a new production lifecycle, recipe, authorization, render receipt or candidate may not be created to assert live E2E. The complete signed-in source → direction → recipe → real render → private review proof is performed against a disposable local database with the exact original bytes; this does not equal accepted production E2E.

Owner acceptance remains **NOT REVIEWED**. No premium-quality certification, competitor superiority, sale, payout, rights/adult-safety verification or launch claim is made. The recovered dependency-ordered blockers remain: (1) no accepted active creator kernel; (2) account/creator eligibility and schema contract unproved; (3) ordinary-creator source-intake dead end; (4) rights/adult safety not operationally proved; (5) payment → delivery/access → earnings → payout unaccepted. This HD repair must not claim to solve the other blockers.

## 2026-10-14 — Same-owned-source Body Directed qualification isolation

**Status: implementation and native proof complete; NOT deployed, no new live plan/candidate.** The owner authorized distinct plans from the existing KingCam hallway source, preserving legacy lifecycle `7f047207-6eaa-47b2-837f-5abf209f8ca2` and its frozen Crown Reveal history. The recorded production failure was `bodyCinema.lifecycle.qualifyBodyDirected` HTTP409 on source `59d425d8-65b8-41cd-abaa-f99be06871ab`.

- `shared/bodyCinemaCandidateLifecycle.ts`, `server/services/bodyCinemaCandidateLifecycle.ts`: optional UUID `planRequestId` identifies one deliberate plan. Matching owned-source/hash/declaration/kind retries return that exact record; distinct UUIDs create distinct lifecycle/project identities under the existing asset transaction lock. Mismatches fail closed without orphan projects. No-token compatibility selects only the oldest Body Directed row; legacy qualification retains its singleton, excluding Body Directed rows. Version comparisons are binary-exact. The existing protected router forwards the strict input; no new bypass or authorization policy was introduced.
- `client/src/components/body-cinema/BodyDirectedDirector.tsx`: stable qualification retry identity, explicit same-original new-plan entry, unchanged saved-plan replay and no automatic reanalysis of an already analyzed/frozen record.
- New `drizzle/0027_body_cinema_plan_source_scope.sql`: one atomic ALTER replaces creator/source uniqueness with creator/source/generated-plan-scope uniqueness. Exact Body Directed assertion version maps to its UUID; legacy rows retain the empty singleton scope. `JSON_VALUE`, explicit binary collation and `RTRIM(id)` make the indexed virtual expression legal/deterministic on tested MariaDB10.11.14. SHA256: `c2c9d6251d24c322278c5be5b405dbdfbaa81343975554432ee7f969b5265319`. Historical0026 SQL is byte-exact, with no historical row/JSON/hash/receipt/timestamp update.
- `scripts/bodyCinemaPhaseAMigration.ts` and journal: only pinned0026/0027, retained prerequisite/advisory-lock checks and protected-backup callback. Bounded raw original-column fingerprints and WRITE locks verify preservation across ALTER. A negative-timestamp count/hash intent cannot advance Drizzle's positive last-applied timestamp; interrupted completion requires matching intent and unchanged history. Unknown/changed schema fails closed. Backup runs once before first DDL. Controller/launcher/guard rules remain unchanged; only current-live/checkout-parent pins, exact0027 path/hash approval and matching regression expectations are synchronized.

### Real local proof and production boundary

The unchanged socket-only disposable MariaDB/storage harness passed **10 files /156 tests, zero failures/skips**, completed2026-10-14 15:53UTC. It includes real signed-session HTTP200 qualification beside legacy pending history, stable replay, distinct/concurrent requests, separately frozen treatments, source/owner/declaration denial, no orphan project, byte-exact legacy lifecycle/project fields,35-row raw JSON/millisecond timestamp preservation, real post-ALTER completion failure/recovery and schema drift rejection. Existing frozen/history/auth/playback/HD regressions remain passing. Synthetic native FFmpeg fixture outputs are test-only, not a new KingCam master or production candidate.

Whole-project and all scoped strict checks, retained consolidated/authentication regressions and production builds passed before final release-hash wiring. Final exact-source gates/builds are rerun before sealing the prepared commit; the outside-repository task handoff records their actual outcome. No gate/suppression or unrelated provider/render/auth change was added.

At2026-10-14 15:55UTC, main/live remain `3a47ce4dc7178893e958ed491a136c9749242033`, public structured backend health is HTTP200/ok:true, and runner21 is offline/not busy with no queued/in-progress workflow. DigitalOcean account login was restored with the owner's fresh email code, whose private copy was removed. Droplet545144175 is active, but Web Console rejects guest authentication; credential-free SSH offers publickey/password and denies unauthenticated root. No available guest administrative credential or alternate authorized computer exists through checked routes. Current disk/inodes/native PM2 cannot be remeasured; yesterday's headroom is historical, not current proof. Provider case12883655 is reopened with investigation/advice-only limits; no host power/reset/access/billing/resource change is requested.

**No main push, deployment, production migration/write, live render/candidate, provider/publication/payment or data cleanup occurred. External spend:$0. Owner acceptance:NOT REVIEWED.** Restore supported guest administration, inspect/repair the runner and prove >3.5GiB free before the normal main push/existing guarded workflow. Only after verified deployment may the authorized source→new plan→HD candidate→desktop/mobile watch/replay milestone run. No soft-launch or other-blocker acceptance is claimed.

## 2026-10-21 — MySQL 8.0.46 post-DDL metadata compatibility successor

The owner authorized the narrow verification correction after guarded run39488166340 applied immutable0027 ALTER but stopped at BODY_CINEMA_PHASE_A_POST_DDL_SCOPE_SCHEMA_MISMATCH. Fresh read-only production evidence shows exact virtual varchar(36) and three-column unique key, one unchanged historical lifecycle, matching durable negative preservation intent, and 33,449,357,312 free bytes. Main is4a3b5609f7849f547af38541550658979dbec222; live remains3a47ce4dc7178893e958ed491a136c9749242033 before this successor.

`scripts/bodyCinemaPhaseAMigration.ts` now recognizes only vetted immutable source/MariaDB and observed MySQL metadata spellings through a bounded lexer. MySQL expands JSON_VALUE's default to RETURNING CHAR(512) and escapes charset literal delimiters. Quoted values/case, both binary collations, exact function/operator/path/version/RTRIM(id)/empty ELSE/return length remain mandatory. Unknown metadata or semantic drift still fails closed. All other column/index/intent/fingerprint/lock/ledger checks, migration SQL/hash/journal, controller implementation, source records, renderer, authentication and provider policy are unchanged. Only the existing checkout-parent literals and their exact regression expectation advance to4a3b…; live/rollback pin remains3a47….

Validation: unchanged private socket-only MariaDB/storage/native FFmpeg harness passes10files/234tests, zero failures/skips, on final source. Exact privately extracted MySQL8.0.46 migration suite passes93/93 including independently seeded post-ALTER/negative-intent recovery, illegal semantic drift, and real interrupted positive-ledger INSERT recovery. SQL audit of the actual MySQL recovery window:110statements,0DDL,0lifecycle mutations,1pinned positive ledger INSERT; original rows and SHOW CREATE unchanged; negative intent retained;0backup callbacks; repeat idempotent. Earlier disposable test fixture/wrapper failures were repaired, not suppressed; final passing logs are preserved outside Git. Retained security/consolidation regressions pass. Mandatory strict checks and production builds complete before this successor is committed/pushed.

Status at preparation: NOT DEPLOYED; no new production plan or render yet. After a successful normal main-push guarded workflow, the owner-authorized single KingCam hallway source→new Body Directed lifecycle→Face & Beauty / literal Face Card /La Reina→separate10.5sHDrecipe→one private render→desktop/mobile complete playback will be attempted without providers/publication/payments. Legacy7f047207-6eaa-47b2-837f-5abf209f8ca2 must remain byte-identical. The1280×720 original is scaled to1920×1080; this does not invent native detail, certify broadcast quality, accept the output, or prove soft-launch readiness. Owner acceptance:NOT REVIEWED. External spend:$0.
