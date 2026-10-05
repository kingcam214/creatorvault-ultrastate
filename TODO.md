# CreatorVault Visual DNA release outcomes

## Durable immutable visual DNA

- [x] Store the complete immutable visual-DNA standard in the canonical repo: `docs/CREATORVAULT_VISUAL_AND_DESIGN_DNA.md`.
- [x] Add an explicit link/reference to it from the project README or engineering/deployment guide.
- [x] Add the global tokens, font configuration, motion utilities, and reduced-motion rules.
- [x] Implement/reconcile shared visual primitives so future routes inherit the system rather than hand-rolling generic UI.
- [x] Ensure tokens/primitives do not break existing application behavior.

## Existing creator journey

- [x] Replace generic visual treatment with the DNA.
- [x] Preserve truthful product state and existing user functionality.
- [x] Do not fake media, AI analysis, revenue, output, provider completion, or job status.
- [x] Do not create visual polish on a dead-end page and call it launch-ready.
- [x] Ensure desktop and mobile are intentionally designed.

## Required validation and exact live release

- [x] Run formatting, configured lint/static checks, type checks, tests, and production build. (No separate lint script is configured.)
- [x] Fix all visual/system regressions found in the selected launch path.
- [x] Capture desktop and mobile local evidence for every route in the selected journey.
- [x] Evaluate every local capture against these literal checks: Is the baseline void-black rather than light or generic? Does typography correctly use Bebas Neue, DM Sans, and Space Mono? Are cyan and gold used according to their semantic roles? Does the route look like a high-budget CreatorVault experience rather than generic SaaS? Are CTA, loading, empty, error, and form states designed? Does mobile feel intentionally composed? Is all product state truthful?
- [ ] Commit the complete work.
- [ ] Push the canonical branch.
- [ ] Deploy through the actual established VPS deployment mechanism.
- [ ] Verify the LIVE production domain: Desktop: current major browser viewport. Mobile: current narrow mobile viewport.
- [ ] Confirm the selected journey’s routes load and remain visually correct.
- [ ] Confirm no console-breaking errors prevent the key journey.
- [ ] Record: Commit SHA. Canonical branch. Deployment workflow/mechanism. Deployment timestamp. Production URL(s) checked. Route-by-route visual pass/fail. Rollback commit/reference.

## Release completion law — original exact clauses

1. The exact implementation is committed to the canonical repository.
2. The canonical branch is pushed.
3. That exact commit is deployed through the real VPS deployment path.
4. Live routes are verified on the production domain.
5. Desktop and mobile evidence confirms compliance.
6. A rollback reference is recorded.

**Starting / recovery reference:** `7b63a1e1f84c83a75b7ca135d23cadd4d58b1fcc`.
**Production mechanism:** main push → `.github/workflows/deploy.yml` → self-hosted `creatorvault-production` → `deploy_work_to_prod.sh`.
**Guardrails:** no payment/payout/provider generation/sends; no FFmpeg creative execution; no new/destructive migrations; no session rotation; do not claim creator-outcome or launch acceptance.

The entire unabridged owner specification is retained in the canonical DNA document, including all stated tokens, restrictions, component dimensions, motion library, type roles, hero pattern and failure conditions. Unverified outcomes remain open until evidence exists.

**Local evidence:** `docs/evidence/visual-dna/README.md` and `visual-dna-local-proof.json`; production acceptance remains pending the exact main-push run and live browser checks.

## Body Cinema Phase A — implementation pending production approval

- [ ] Require authenticated creator ownership of the exact ready original media asset. Verify source storage receipt/path, re-read bytes where supported, and bind a hash to the source.
- [ ] Record a versioned creator assertion for ownership, performer/likeness consent, treatment scope, and intended use. Distinguish self-attestation from independently verified rights, age, identity, and consent. Fail closed on missing/mismatched bytes, wrong owner, unknown rights, unsupported video, or inaccessible storage. Do not turn a checkbox into a “rights verified” claim.
- [ ] Freeze one versioned Crown Reveal specification tied to that source. Include the intended feeling, opening/hook, selected source moment, creator-approved body/face emphasis and crop boundaries, rhythm, sound, color/light, typography, ending, proposed 9:16 output, and automatic reject conditions. A treatment is a plan—not an edit or output.
- [ ] The server must distinguish source qualification, frozen plan, awaiting candidate, attached candidate, creator review, rejection, creator acceptance, and accepted master.
- [ ] Exactly one candidate slot; no silent replacement or automatic retry. Immutable creator/source/hash/treatment identity after freezing. Candidate attachment must require separate future authorization. Later attachment must check owned storage, output bytes/hash, provenance, source linkage, and playable media.
- [ ] Creator accept/reject must be explicit, authenticated, durable, and tied to the exact reviewed candidate hash. Reject retains private evidence and cannot create a master. Only the creator-accepted exact candidate can become an accepted master. Owner approval of public marketing claims remains separate from creator creative approval. Enforce idempotency and concurrency safety.
- [ ] Update the existing `/vault-x/studio` experience. Preserve its cinematic CreatorVault design. Clearly label plan, awaiting-candidate, review, rejected, accepted, and master states. Replace unsupported “Rights verified” or “Verified original” wording with the narrow truth actually checked. Disable Download unless there is an owned, accessible real asset. Do not show a finished result for a locked plan or failed request.
- [ ] Preserve work across reload and re-entry. Maintain mobile, desktop, keyboard, contrast, and reduced-motion usability.
- [ ] Allow a durable draft-planning handoff only from an accepted Body Cinema master. Carry the master/source IDs and hashes, treatment version, and creator decision reference. Save an approximately 8-second teaser plan, approximately 12-second reel plan, three source-specific hooks/titles, and caption direction. These are planning artifacts—not rendered trailers, exports, posts, or promotional claims. Reject handoff for any unreviewed, rejected, missing, or wrong-owner candidate.
- [ ] Use isolated synthetic fixtures. Cover owner isolation; changed/missing source bytes; unknown rights; treatment immutability; concurrent duplicate slot requests; forbidden candidate attachment; decision without a playable candidate; rejection without master/handoff; exact-hash acceptance; duplicate decisions; download gating; and existing Body Cinema, media, Trailer Maker, and Video Studio regressions.
- [ ] Run applicable tests, type checks, formatting/static checks, and client/server production builds. Report real commands and results.
- [ ] Any needed migration must be minimal, additive, reviewed against production tracking, and have a nondestructive rollback plan.
- [ ] Before a production-changing step—including a migration or push that triggers VPS deployment—pause for the owner’s explicit approval of the exact commit, changed files/tables, production target, and rollback plan.
- [ ] After approval, push through the established canonical workflow, deploy the reviewed commit, verify `/__release` SHA, PM2/HTTP/log health, and real desktop/mobile pending states. Run authenticated production writes only if separately authorized; otherwise label that proof limitation accurately.

Phase A counts as released only when its reviewed commit is pushed, deployed to the VPS, live SHA and desktop/mobile states are verified, tests pass, and rollback is recorded. It does NOT count as a finished Body Cinema video or creative-quality proof.

**Hard boundary:** no video creation, candidate attachment in production, Pollo/other provider, FFmpeg creative editing, human editor, publishing, payments, payouts, or production test-account creation. Main/live baseline and rollback reference: `552aee6aa27a79c717e96b60fefa72703deeb356`. Local branch: `feat/body-cinema-phase-a-lifecycle`. No production approval exists for a Phase A commit yet.

### Phase A local verification — 2026-10-04

The lifecycle implementation is local-only and awaiting exact-commit production approval. Verified on isolated fixtures: 19 native lifecycle/migration/boundary/UI tests, 38 retained Body Cinema policy tests, 27 creator/Video Studio tests, 48 security tests, and the existing disposable regression harness (58 Stripe tests, 57 Persona tests, 27 Video Studio tests, 26 migration/release tests). Scoped video, deployment and security strict checks passed; whole-project `pnpm check` and production server/client builds passed. The private native fixture was removed. No media was creatively rendered; tests copied an existing test MP4 for byte/provenance/playback assertions only.

Native proof includes source owner isolation and changed/missing byte rejection; an immutable treatment and one concurrent reservation; a server-only future authorization writer requiring a protected, root-owned 0600 exact owner-pilot approval file; default-denied attachment; exact-hash review/acceptance/rejection; rejected evidence with no master or handoff; idempotent decisions; authenticated HTTP 200/full bytes, 206/range bytes, HEAD, 416/bad range, 401/anonymous, 403/wrong owner, and accepted-master-only download; plus denial of legacy generic project/assembly master bypasses. The future grant writer is not an HTTP/tRPC endpoint and has not been called in production.

The prepared Phase A production path does not provision a production login/test account or make authenticated production requests. Existing login/security regressions remain isolated local tests. A release will require explicit approval before main push, protected database backup, the single additive 0026 table/tracking entry, guarded artifact activation and PM2 reload. Current main/live remain `552aee6aa27a79c717e96b60fefa72703deeb356`. Desktop/mobile live Phase A verification and production persistence proof are NOT PERFORMED; no release or creative-quality acceptance is claimed.

### Live same-source pending-state proof and authorized error repair — 2026-10-05

The historical local-only entries above are superseded for deployment identity: Phase A is live at `80748aa9e50b3196d3d8f796b63e855c6ded6c4e`, deployed by the existing guarded workflow run `37319786271`. Owner-authorized lifecycle `7f047207-6eaa-47b2-837f-5abf209f8ca2` retained source asset `59d425d8-65b8-41cd-abaa-f99be06871ab` and source SHA-256 `be47961db996e097b0ec47d902aa6657db2cbab11df71bdaeded972455f63b7b`. Freeze and the single slot reservation each returned HTTP 200 on the same lifecycle. The live page now shows `awaiting_candidate`; no candidate, review, decision, accepted master, or planning handoff exists. Desktop 1440×1000 and mobile 390×844 screenshots were captured. No new source or lifecycle was created in this run, no candidate was attached, and no provider, creative FFmpeg, publishing, financial or messaging operation ran.

The earlier browser interruption is not proven to be a platform session defect: the secure owner session survived browser recovery and both live writes succeeded without another login. The browser had reported its own disabled crash-loop state. Auth, cookies, session lifetimes and credentials remain unchanged.

The earlier silent qualification failure exposes reliance on transient toast-only mutation errors. The authorized correction gives the existing `/vault-x/studio` actions a persistent step-specific plain-language alert, keyboard focus and automatic scroll into view, using the current dark/cyan/gold typography and panel system. All server lifecycle invariants and the Crown Reveal contract are unchanged. Focused UI tests cover the 412 reason, schema/unknown error fallbacks, escaping, empty feedback, accessibility and mutation coverage.

The correction branch starts at current main `80748aa9e50b3196d3d8f796b63e855c6ded6c4e`. Workflow and policy use that exact push predecessor/direct parent; because the controller checks both public live SHA and protected active artifact against its parent constant, its scope/artifact/rollback baseline is advanced to the same verified live release. No gate is loosened and the 28-path allowlist and all migration/security/provider pins remain unchanged. Final-commit runner-shaped offline predeployment simulation and guarded deployment/live re-entry verification are required before this correction is called delivered. Migration 0026 is already tracked; the unchanged helper must report already-applied rather than reapply DDL or alter lifecycle records. Rollback reference for this correction is the current verified `80748aa9e50b3196d3d8f796b63e855c6ded6c4e` artifact; no rollback is executed manually.


## Body Cinema — body-directed cinematic planning correction — 2026-10-05

Starting main/live baseline: `532c3de5fb7bafcbeb47560697bcb8cbd95d8401`. Existing Crown Reveal records and all existing presets remain historical/readable; no candidate/provider/render/publication/Trailer Maker action is part of this correction.

- [ ] Source-bound body/movement map and eligible timecodes, with genuinely unknown details retained as unknown.
- [ ] Structured body focus → edit language → visual identity registry, source-aware options and immutable snapshots through existing source-map, blueprint and freeze owners.
- [ ] Premium source-first `/vault-x/studio` interaction, no long technical form or fake candidate preview.
- [ ] Focused and retained offline tests, typing, builds, guarded release checks and exact release evidence.

### Binding owner acceptance clauses

MANUS — BODY CINEMA CORRECTION. READ THE CURRENT BODY CINEMA IMPLEMENTATION AND THE PREVIOUS TASK RESULT FIRST. DO NOT BUILD ANOTHER FILTER PICKER. FIX THE MISSING PRODUCT CORE.

Body Cinema is a BODY-DIRECTED CINEMATIC EDITING ENGINE, not a visual-grade or “choose a filter” product.

Keep the current visual/mood treatment work for now, including Claude’s treatment names. They are the LOOK layer only. Do not delete or replace them. Correct the architecture so a creator first chooses WHAT SHE WANTS CELEBRATED, then chooses HOW IT IS EDITED, then chooses the mood/grade.

Required product model:

SOURCE VIDEO
→ source-aware body + movement analysis
→ creator selects body focus
→ creator selects edit language/treatment
→ creator selects visual identity / grade
→ Body Cinema creates a source-aware cinematic shot plan
→ only later, after separate authorization, a provider may create a candidate

Do not call any provider. Do not render, create, attach, publish, send, charge, or claim a real candidate. Keep governed media execution default-deny.

THE THREE REQUIRED LAYERS

1) BODY FOCUS — what is being celebrated:
- Abs / core
- Glutes / lower body
- Full body
- Legs
- Curves / silhouette
- Dance / twerk movement
- Face / hair / beauty
- Hands / jewelry / styling
- Fitness overall

2) EDIT LANGUAGE — what Body Cinema actually does:
- Shot order and timecoded source selection
- Camera emphasis and framing
- Crop progression
- Detail inserts
- Angle logic
- Movement/pose moments
- Cut rhythm and pacing
- Slow-motion eligibility
- Transition language
- Hero-frame selection
- Do-not-use ranges

3) VISUAL IDENTITY / GRADE — retain the current treatment library:
Obsidian, Golden Hour, La Reina, Midnight Heat, Melanin Luxe, Cartel Chic, Island Girl, Silk Road, Drip, Voodoo, Southside, Goddess Mode, Noche Buena, Royalty Check, Pressure.

THE MISSING BODY-FOCUS TREATMENT LIBRARY

Implement this as canonical structured data—not hard-coded UI copy. Each option needs a stable ID, body focus, name, short creator-facing promise, shot logic, framing/crop logic, pacing, movement logic, suggested visual identities, guardrails, and provider-ready direction.

ABS / CORE:
- Pressure Core: crisp abdominal detail, slow push-ins, beat-synced flex moments, athletic contrast
- Sculpted: clean light/shadow contour, tight-to-mid crop progression, editorial motion
- Core Command: power angles, controlled detail inserts, serious training-film pacing
- Sun-Kissed Set: warm natural fitness light, outdoor movement, natural skin detail

GLUTES / LOWER BODY:
- Backstage: slow-turn reveal, full lower-body framing, controlled movement rhythm
- Motion Theory: movement-led cuts, side/rear compositions, beat timing without explicit framing
- Curve Currency: luxury silhouette detail, slow-glide camera language
- After Hours: low-light movement, deliberate pacing, Midnight Heat-ready direction

FULL BODY:
- Main Character: full-body entrance, walk, turn, pause, final hero frame
- Body Language: posture, movement, confidence, styling, narrative sequencing
- The Reveal: detail → mid-shot → full-body hero progression
- Runway Heat: fashion-editorial walk cycles, controlled 360 moments, confident pacing

LEGS:
- Leg Day Cinema: training emphasis, stride/stance cuts, athletic detail
- Long Story: vertical compositions, walking sequences, clean editorial lines
- Step Out: shoe-to-full-body progression, entrance framing, city/nightlife energy

CURVES / SILHOUETTE:
- Silhouette Season: backlight, outline/profile movement, body contour without distortion
- Hourglass: waist-to-full-frame progression, pose transitions, warm luxury lighting
- Soft Power: diffused light, elegant movement, premium feminine composition

DANCE / TWERK MOVEMENT:
- Rhythm Control: music-led movement cuts, confidence, beat locking; never a repetitive generic loop
- Shake Theory: fast/slow contrast, pause-and-release, varied camera distances
- Bassline: low-light club/editorial movement, tempo shifts and beat-drop logic
- Carnival Motion: Caribbean color, outdoor/daylight movement, celebration energy

FACE / HAIR / BEAUTY:
- Face Card: polished close-ups, hair movement, eyes/lips/jewelry details, entrance framing
- Soft Focus: beauty-campaign lighting, gentle transitions, true skin-tone preservation

HANDS / JEWELRY / STYLING:
- Drip Detail: rings, chains, nails, gloss, outfit texture, premium detail inserts between hero shots

FITNESS OVERALL:
- Built Different: workout-to-hero progression, physique detail, movement, intensity
- Proof of Work: documentary training energy, reps, recovery, sweat, result framing

THE PRODUCT MUST OFFER VARIATION

Do not make one template per body area. A creator must receive different options for the same focus. The same body focus plus different edit language and visual identity must yield materially different shot plans.

Examples:
- Abs + Pressure Core + Obsidian = dark high-contrast athlete film
- Abs + Sculpted + Golden Hour = warm outdoor editorial fitness film
- Full Body + Main Character + La Reina = regal entrance sequence
- Dance + Rhythm Control + Island Girl = tropical celebration movement sequence
- Curves + Curve Currency + Silk Road = refined luxury silhouette film
- Style + Drip Detail + Cartel Chic = dark luxury jewelry/fabric cutaway system

SOURCE-AWARE BODY AND MOVEMENT MAP

Do not fake detection. Extend or reuse the existing Body Cinema source map / edit blueprint architecture.

The system must store a structured analysis result that can represent:
- timecoded usable ranges
- visible focus areas
- pose/movement type
- framing quality
- lighting quality
- stability
- best eligible treatments
- source limitations
- excluded/do-not-use ranges

Example shape only:

00:00–00:03: full body, front-facing, stable, good light; eligible for Main Character / entrance
00:04–00:06: core visible, stable torso framing; eligible for Pressure Core / Sculpted
00:07–00:10: lower-body dance movement; eligible for Rhythm Control / Carnival Motion

No source map may claim a body feature is available when it is not visible. Treatment recommendations must only use eligible source ranges. If the source does not support a chosen treatment, explain this clearly and offer the closest supported options; do not fake it.

SAFETY AND TRUTH

Treatments direct cinematic attention—not body modification.

Never:
- reshape, enlarge, shrink, sexualize beyond creator-selected framing, alter age, alter identity, change ethnicity, lighten skin, erase natural texture, or invent anatomy
- imply a selected treatment is already applied
- show an abstract swatch as a generated result
- generate a provider prompt that requests body alteration
- call any provider, spend money/credits, create a candidate, publish, or hand off to Trailer Maker

Every frozen plan must preserve:
- selected body focus
- selected body-focus treatment
- selected visual identity
- selected eligible timecodes
- source-map snapshot
- edit-blueprint snapshot
- preservation constraints
- limitations / excluded ranges

A frozen plan cannot silently change if the registry changes later.

UI: PREMIUM, SIMPLE, NOT A LONG FORM

The sequence must be:

1. WHAT ARE WE SHOWING OFF?
Abs / Curves / Glutes / Legs / Full Body / Face & Beauty / Style & Drip / Fitness / Dance & Twerk

2. PICK YOUR CINEMATIC TREATMENT
Show only treatments relevant to the selected body focus. Cards must be premium, visually distinct, and explain what the edit actually does.

3. CHOOSE THE MOOD
Use the existing visual identity library.

4. YOUR BODY CINEMA OPTIONS
Recommend 3–5 genuinely distinct combinations based on the source map. Each recommendation must show:
- focus
- body treatment
- visual identity
- edit intent
- source-supported timecodes or a simple “supported by your source” indicator
- clear notice: “Plan only — no candidate generated yet.”

Example:
PRESSURE CORE
Obsidian · Athlete Film
Core-detail push-ins, controlled power pacing, hero-frame finish.
Plan only — no candidate generated yet.

Use CreatorVault visual DNA: void background, cyan and restrained gold, Bebas Neue for major names, DM Sans body copy, premium editorial layout. No generic SaaS cards, tiny gray text, raw UUIDs, technical forms, fake preview results, or clone-like filter grid. Technical data belongs behind Details.

COMPATIBILITY

Do not rewrite, delete, rename, or mutate the existing legacy Crown Reveal lifecycle or its historical data. Existing legacy records must remain readable as legacy. Do not create a parallel disconnected system: inspect and extend the current Body Cinema source map, edit blueprint, plan freeze, direction/preset, output ladder, and provider-ready brief paths.

TESTS

Add focused tests proving:
- all body-focus categories and treatment IDs are structured, unique, and valid
- each focus has multiple distinct treatment options
- recommendations are source-aware and reject unsupported body focus/timecodes
- frozen plans snapshot body focus, edit treatment, visual identity, source map, and edit blueprint
- body-treatment selection creates no provider/network call
- no prompt direction requests identity/body/skin-tone alteration
- legacy Crown Reveal remains unchanged/readable
- UI shows relevant treatments rather than a generic all-purpose filter grid
- typecheck, existing tests, build, and guarded release checks remain green
DEPLOY ONLY THROUGH THE EXISTING GUARDED PATH. START FROM CURRENT origin/main. NO FORCE PUSH, NO MANUAL SERVER DEPLOYMENT, NO SECRETS OR ENVIRONMENT CHANGES.

### Body-directed correction — local implementation and proof, 2026-10-05

The existing `/vault-x/studio` owner now connects original-video playback, real in-browser pose/canvas measurements, creator-confirmed visible-detail marks, nine body focuses, the structured cinematic edit-language registry, and all fifteen retained visual identities. A source-bound immutable V2 plan snapshots the original hash, source map, selected focus/treatment/look, exact eligible ranges, edit blueprint, constraints, limitations and exclusions in the existing lifecycle/Creation Project storage. No new table or migration is introduced. Historical Crown Reveal records retain their original bytes and are opened only through a separate read-only archive; they are never reinterpreted as a new body treatment.

Confirmed review defects were repaired before release: source support is now assessed per selected focus, not copied from the global eligibility list; new source marks invalidate old selected range IDs and locking requires the exact current displayed order; The Reveal now uses exact measured face detail → shoulders/hips torso framing → full-body crops, and Step Out requires actual full-body evidence. Arbitrary crop changes, out-of-bounds or low-confidence features, unconfirmed details and unsupported source intervals are rejected. Visual-identity hold variants use source-bounded 80ms timing steps, not label-only or one-millisecond filler. The original is never presented as a generated preview or graded result.

The private native suite passed 52 tests across six files, including the retained lifecycle/migration/playback/bypass suite, fourteen pure cinematic compiler tests and the UI contracts. Whole-project cold typing, scoped video/security/release checks, retained security/Video Studio/nonspending tests, and both production bundles passed during local validation. The final committed-checkout guarded workflow simulation and live UI/source-plan verification are still required before this correction is called released. All fixtures were disposable; no production test account, provider request, candidate, render, attachment, Trailer Maker handoff, publication, payment or payout has been made. Production remains at `532c3de5fb7bafcbeb47560697bcb8cbd95d8401` until the authorized successor passes its guarded release.
