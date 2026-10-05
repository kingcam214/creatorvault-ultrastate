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
