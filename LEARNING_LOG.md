# CreatorVault Agent Learning Log

This file is the permanent memory for all recurring mistakes, platform-specific rules, and hard-won lessons. Every agent session MUST read this file before writing any code or making any changes to the platform.

---

## 1. SERVER IMPORT PATHS — CRITICAL

**The build entry point is `server/_core/index.ts`, NOT `server/index.ts`.**

All routers live in `server/routers/` and must import from the following paths:

| Import | Correct Path |
|--------|-------------|
| tRPC router/procedure helpers | `from "../_core/trpc.js"` |
| Database (`getDb`, `db`) | `from "../db.js"` |
| TRPCError | `from "@trpc/server"` |
| Zod | `from "zod"` |

**Wrong paths that have caused build failures repeatedly:**
- `from "../trpc"` — WRONG (no `_core`, no `.js`)
- `from "../_core/db.js"` — WRONG (db.ts lives at `server/db.ts`, not `server/_core/db.ts`)
- `from "../trpc.js"` — WRONG (missing `_core`)

**Correct pattern (copy this exactly):**
```ts
import { router, protectedProcedure } from "../_core/trpc.js";
import { getDb } from "../db.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
```

**The real `_core/routers.ts` (not `server/routers.ts`) is what gets compiled.** Always register new routers in BOTH:
1. `server/_core/routers.ts` — the actual compiled file
2. `server/routers.ts` — the validator/pre-build check file

---

## 2. DATABASE USAGE — CRITICAL

`getDb()` returns a **Drizzle ORM instance**, NOT a raw mysql2 connection.

| Correct | Wrong |
|---------|-------|
| `await db.execute(sql\`...\`)` | `await db.query(...)` |
| `await db.execute(sql\`...\`)` | `await db.end()` |
| No cleanup needed | `await db.end()` — does not exist |

**Never call `db.end()` or `db.query()`.** Use `db.execute()` for raw SQL or Drizzle query builder methods (`db.select()`, `db.insert()`, `db.update()`, `db.delete()`).

---

## 3. BUILD SYSTEM — CRITICAL

**The correct esbuild binary is:**
```
/usr/lib/node_modules/tsx/node_modules/@esbuild/linux-x64/bin/esbuild
```

The `node_modules/.bin/esbuild` shebang wrapper is **broken** on this VPS (Node.js v20 incompatibility). Never use it.

**Correct build command:**
```bash
cd /root/creatorvault
/usr/lib/node_modules/tsx/node_modules/@esbuild/linux-x64/bin/esbuild server/_core/index.ts \
  --bundle --platform=node --format=esm --outdir=dist \
  --packages=external
```

**The `npm run build` script also runs pre-checks** (`validate-routers.cjs`, `check-app-imports.cjs`, `check-dashboard-cards.cjs`) that will BLOCK the build if a new router is not properly registered. Always use the direct esbuild command above when doing rapid iteration, and run `npm run build` for full validation before final deploy.

---

## 4. ROUTER REGISTRATION — CRITICAL

New routers must be registered in **two files** on the VPS:

1. **`/root/creatorvault/server/_core/routers.ts`** — the actual compiled appRouter
2. **`/root/creatorvault/server/routers.ts`** — the pre-build validator target

Both files must have:
- The `import` statement at the top
- The router key in the `appRouter` object

**Import path in `_core/routers.ts` uses `.js` extension:**
```ts
import { chicaFunnelRouter } from "../routers/chicaFunnelRouter.js";
```

---

## 5. AUTHENTICATION — CRITICAL

The platform uses **JWT Bearer token auth**, not session cookies.

**Login endpoint:** `POST /api/trpc/simpleAuth.login`
**Credentials:** `{ email: "kingcam214@gmail.com", password: "KingCam214CreatorVault" }`
**Token location:** `response.result.data.json.token`
**Usage:** `Authorization: Bearer <token>` header on all subsequent requests

The session cookie is NOT set by the server — always use the Bearer token from the login response.

---

## 6. PRESENTATION EMPIRE — KNOWN BUGS (FIXED)

The following bugs were found and fixed in the Presentation Empire router. If the router is ever rebuilt from source, these fixes must be re-applied:

1. **Premature `db.end()`** — the outer connection was closed before the `setImmediate` async PDF generation block completed. Fix: move DB connection creation inside the `setImmediate` block.
2. **Wrong PDF script path** — `import.meta.url` resolves to `dist/index.js`, so relative paths resolve to `dist/../services/` which doesn't exist. Fix: use hardcoded absolute path `/root/creatorvault/server/services/generatePitchDeckPDF.py`.
3. **`zip` not installed** — install with `apt-get install -y zip`.

---

## 7. VPS DEPLOYMENT FACTS

- **VPS IP:** `134.199.202.69`
- **SSH user:** `root`
- **SSH password:** `KingCam214CreatorVault`
- **App directory:** `/root/creatorvault`
- **PM2 process name:** `creatorvault`
- **Dist output:** `/root/creatorvault/dist/index.js`
- **Uploads directory:** `/root/creatorvault/storage/uploads` (symlinked to `dist/uploads`)
- **Node version:** v20.20.0
- **Package manager:** pnpm

---

## 8. CHICAS EMPIRE — USER IDs AND PHONES

| ID | Name | Stage Name | Phone |
|----|------|-----------|-------|
| 8001 | Delbania | Empresariajovendebi | +1 (809) 443-9549 |
| 8002 | Marielka | China2 | +1 (849) 785-0387 |
| 8003 | Lizzy | Slim | +1 (849) 533-2170 |
| 8004 | Lirys | Lirys Twin | +1 (849) 440-6834 |

Morning brief scheduler fires at **7:00 AM Dominican Republic time (UTC-4)**.

---

## 9. OWNER ACCOUNT

- **Email:** `kingcam214@gmail.com`
- **Password:** `KingCam214CreatorVault`
- **Role:** `king`
- **Platform:** creatorvault.live

---

## 10. PLATFORM TOOLS — USE THESE, NOT MANUS TOOLS

**ALWAYS use the platform's own APIs for generation tasks:**
- Slide decks / pitch decks → `chicaFunnel.generatePackage` or `presentationEmpire.generatePitchDeck`
- Video renders → `kingWorld3D.renderEpisodeTrailer` / `kingWorld3D.renderEmpireMapSnapshot`
- PDF reports → `presentationEmpire.generatePitchDeck`

**NEVER use Manus internal tools** (`slide_initialize`, `slide_edit`, etc.) for content that should be generated by the platform. This wastes credits and bypasses the platform's own engines.

---

*Last updated: Mar 26, 2026*

---

## RULE 11: db import path is '../db.js' NOT '../_core/db.js'
**Date:** 2026-03-26
**Lesson:** There is NO `server/_core/db.ts` file. The database is exported from `server/db.ts`.
**Correct:** `import { db } from '../db.js';`
**Wrong:** `import { db } from '../_core/db.js';` ← THIS BREAKS THE BUILD

## RULE 12: ownerProcedure does NOT exist — use kingProcedure
**Date:** 2026-03-26
**Lesson:** The owner/admin procedure is called `kingProcedure`, not `ownerProcedure`.
**Available procedures:** `publicProcedure`, `protectedProcedure`, `adminProcedure`, `kingProcedure`
**Correct:** `import { router, kingProcedure } from '../_core/trpc.js';`

## RULE 13: Each chica has a DIFFERENT business model — do NOT assume VaultX for all
**Date:** 2026-03-26
**Lesson:** Only Marielka (8002) and Emma do adult content on VaultX.
- Delbania (8001): Fitness influencer + boutique (expensive hair). NO adult content.
- Marielka/China (8002): Adult content → VaultX. YES adult content.
- Lizzy/Slim (8003): Sexy fitness content + lifestyle. NO adult content.
- Lirys/Twin (8004): Airbnb host + lifestyle. NO adult content.
**Rule:** Always ask about each chica's business model before building their funnel.

## RULE 14: TikTok monetization bridge — TikTok = free ads, NOT direct income
**Date:** 2026-03-26
**Lesson:** All 4 chicas have TikTok but cannot monetize it directly (requires US/UK/CA/AU residency + 10K followers + no adult content).
**Solution:** TikTok → link-in-bio → creatorvault.live/chica/{id} → paid platform (boutique/VaultX/fitness plan/Airbnb)
**Rule:** NEVER promise TikTok direct monetization. Build the bridge to paid platforms instead.

---

## RULE 11: db import path is '../db.js' NOT '../_core/db.js'
**Date:** 2026-03-26
**Lesson:** There is NO `server/_core/db.ts` file. The database is exported from `server/db.ts`.
- **Correct:** `import { db } from '../db.js';`
- **Wrong:** `import { db } from '../_core/db.js';` — THIS BREAKS THE BUILD

## RULE 12: ownerProcedure does NOT exist — use kingProcedure
**Date:** 2026-03-26
**Available procedures:** `publicProcedure`, `protectedProcedure`, `adminProcedure`, `kingProcedure`
- **Correct:** `import { router, kingProcedure } from '../_core/trpc.js';`

## RULE 13: Each chica has a DIFFERENT business model — do NOT assume VaultX for all
**Date:** 2026-03-26
- Delbania (8001): Fitness influencer + boutique (expensive hair). NO adult content.
- Marielka/China (8002): Adult content → VaultX. YES adult content.
- Lizzy/Slim (8003): Sexy fitness content + lifestyle. NO adult content.
- Lirys/Twin (8004): Airbnb host + lifestyle. NO adult content.

## RULE 14: TikTok monetization bridge — TikTok = free ads, NOT direct income
**Date:** 2026-03-26
**Solution:** TikTok → link-in-bio → creatorvault.live/chica/{id} → paid platform (boutique/VaultX/fitness/Airbnb)

---

## RULE 15: GOVERNED CREATION PROOF — MANDATORY
**Date:** 2026-08-17

Before any governed creation, provider submission, production build, deployment, migration, or repair run, read this learning log first. Add the result of that run before starting another one. A database record, request ID, code path, or deployment is not proof. A capability is proven only by a real source, real provider execution, and a finished watchable output.

**Corrective mode:** repair only the exact visible defect. No substitutions, adjacent changes, new creative direction, or unverified claims. If a correction fails, return to the last known-good release.

**Construction mode:** execute the whole approved creation package. Do not downgrade a locked requirement because an easier, smaller path works.

Manus has execution authority, not creative-vision authority. A rejected output is removed, not silently replaced. FFmpeg is for technical handling only; never use it for creative effects, filters, simulated camera motion, captions, color treatment, transitions, speed changes, freezes, or animation.

## RULE 16: KINGCAM FULL-BODY MOTION — GOVERNED SOURCE AND QUALITY LAW
**Date:** 2026-08-17

The active KingCam full-body proof source is:
`https://creatorvault.live/videos/kingcam-hero-cam.mp4`

The output must be vertical, 10 seconds, full body from crown to shoes, natural gait, controlled camera movement, preserved face/body/wardrobe/hands/feet, and no extra people or text. The proof rejects plastic anatomy, warped hands, missing body, stiff movement, broken identity, unexpected people, or a weak ending.

Runway rejected the KingCam full-body source twice with a moderation/no-output failure. It is not the active full-body KingCam generation lane. HeyGen is for close-up live responses only, not full-body, full-motion generation. Pollo is the active motion arsenal. Seedance 2.5 ref-to-video has a verified 33-credit quote for the selected proof shape. Kling v3 Omni ref-to-video is an alternative governed lane, not an automatic retry.

General Pollo generation remains default-deny. The single permitted exception is one owner-directed proof with one output, a real provider quote, stored draft, approval, 10-minute single-use permit, fixed 33-credit maximum, and no automatic retry.

## 2026-08-17 — CURRENT KINGCAM PROOF ENTRY

The Clone Command path now prepares exactly one full-body KingCam proof through the existing governed Pollo lifecycle: real source reference, provider quote, stored draft, owner approval, one-time permit, provider submit, and a recorded job link. The screen exposes that fixed 33-credit limit and does not open general Pollo generation.

**Current status: UNVERIFIED CREATION.** The code passes the TypeScript check and the release scope guard. The production build, deploy, live-route verification, provider execution, finished-video inspection, and accept-or-reject decision have not yet been completed. No watchable KingCam proof exists from this entry yet.

## Required next-run order

Read this log. Confirm the real source and provider contract. Run the type check and scope guard outside the deployment lane. Build before commit. Verify the deployed release identifier. Run only the single approved request if the authenticated owner action is available. Retrieve and inspect the resulting video. Record the exact acceptance or rejection reason. Never call the feature live until the finished video can be watched.


## 2026-08-18 — KINGCAM SEEDANCE 2.5 FULL-BODY PROOF RESULT

**Real provider run:** governed job `97`; motion request `c009bd31-ee7a-430c-9c06-577ee677239b`; Seedance 2.5 ref-to-video; one 10-second vertical output; quoted ceiling 33 credits / $0.33; no automatic retry. The real CreatorVault source was `https://creatorvault.live/videos/kingcam-hero-cam.mp4`.

**Finished-video result:** the render completed and was inspected. It held the full-body crown-to-shoes frame, face/beard/skin/body identity, stable environment, controlled camera, no extra people, no text, and no severe anatomy break. It was still **REJECTED at 75/100**. During the turn, the gold trim on the pants changed into a white/silver floral pattern, and shoe-side detail shifted. This is visible wardrobe drift and fails the source-preservation law.

**Permanent provider learning:** do not use the exact Seedance 2.5 full-body orbit treatment/prompt/source configuration for public KingCam output again. The rejected output is excluded from public KingCam media. Do not auto-retry it. A new full-body proof must change the provider lane or creative treatment only after the exact defect is addressed and a new owner-directed bounded request is created.


## 2026-08-18 — SECOND KINGCAM SEEDANCE CORRECTIVE PROOF RESULT

**Real provider run:** governed job `98`; motion request `4162634d-acee-4878-8755-4b57b1c87f24`; Seedance 2.5 ref-to-video; one 10-second vertical output; quoted ceiling 33 credits / $0.33; no automatic retry. The correction removed the orbit and ordered a locked, front-facing full-body frame with an unchanged pant trim and shoes.

**Finished-video result:** the render completed and was inspected. It was **REJECTED at 15/100**. The provider ignored the no-turn correction and generated a full 360-degree spin, showed visible shoe morphing, chain melting, asymmetric trim, and an opening malformed hand.

**Permanent provider learning:** Seedance 2.5 ref-to-video has now failed twice on the same KingCam source: once during an orbit and again after the orbit/turn was explicitly forbidden. Stop spending on Seedance for KingCam full-body proof. Do not retry this source with Seedance. The next corrective proof must use a different verified provider lane and must retain one output, a documented quote, an explicit hard ceiling, and an accept-or-reject inspection.


## 2026-08-18 — KINGCAM KLING QUOTE-GATE RESULT

The governed Kling v3 Omni reference-to-video corrective lane was deployed with a 20-credit maximum and a rule that it cannot create a draft or send a provider request without a real provider estimate. The live quote request returned **404 Not Found** from Pollo’s estimate endpoint. The gate stopped correctly: **no draft was created, no permit was created, and no chargeable provider request was sent.**

**Permanent provider learning:** Pollo’s documented Kling v3 Omni ref-to-video contract is visible, but this API account does not expose a usable estimate endpoint for that model path. Do not substitute a guessed price or manually force a credit cap. Before any Kling submission, CreatorVault needs an exact source of the current model cost that the governed service can record, or a provider-native budget-enforcing path. Seedance remains barred for KingCam full-body proofs.


## 2026-08-18 — KINGCAM CLONE-ONLY SOURCE-VIDEO CORRECTION

After two inspected Seedance rejections and a Kling quote gate that correctly refused to guess a price, the next KingCam corrective proof is the existing CreatorVault **clone-only** Replicate Wan 2.7 VideoEdit source-video lane. It is not available to Body Cinema. It preserves the actual KingCam source video as input, has one output only, uses a documented **$2 USD maximum**, has no automatic retry, and reuses the existing governed draft, approval, single-use permit, submit, poll, and quality-review chain.

This is a corrective source-preservation test only. It must be rejected for any changed identity, wardrobe, jewelry, shoes, anatomy, camera rule, source performance, or environment geometry. No result becomes public KingCam media without a finished-video review.


## 2026-08-18 — KINGCAM CLONE-ONLY SOURCE-DURATION FAILURE

**Real provider run:** governed job `99`; clone-only Replicate Wan 2.7 VideoEdit; one submitted request; documented $2 maximum; no retry. The provider rejected it before rendering because the KingCam source is **5.04 seconds** while the request incorrectly asked for **10 seconds**: `InvalidParameter - Setting duration 10 exceeds video duration 5.04.`

**Corrective rule:** this was a source-duration contract failure, not a visual-quality failure. Do not change KingCam’s source, direction, identity, wardrobe law, or provider lane. The exact repair is to constrain the clone-only proof to a 5-second output that does not exceed the actual source duration, then rerun the same governed one-output path.


## 2026-08-18 — KINGCAM CLONE-ONLY STALL SAFEGUARD

The corrected five-second clone-only request, governed job `100`, was accepted by Replicate and remained submitted well beyond the two-minute provider deadline despite repeated status checks. It has not produced a finished video and no duplicate request has been created.

**Corrective rule:** CreatorVault must never merely mark an already-submitted Replicate job cancelled in its own database. For a stalled clone-only source-video prediction, it must call Replicate’s provider-side cancellation endpoint, record the provider response, release the reserved budget, and then allow a new controlled decision. This safeguard is now being deployed before resolving job `100`.


## 2026-08-18 — KINGCAM STALLED PROOF RESOLVED

Governed job `100` was stopped through Replicate’s provider-side cancellation endpoint after exceeding the provider deadline without returning a video. CreatorVault recorded `replicate_provider_cancelled`, confirmed the `provider_cancellation_confirmed` event, and released the reserved budget. The job has **no output URL, no artifact, no quality state, and no accepted media**. No automatic retry or replacement request was created.

**Permanent rule:** a provider task that remains active beyond its declared deadline is not a completed proof and must never be left as an open creation lane. Stop it at the provider, record the raw provider response, release the reservation, then require a fresh, separately governed decision before any future run.


## 2026-08-18 — SOURCE-VIDEO CANDIDATE CONTRACT AUDIT

A no-charge, owner-authorized Pollo capability refresh exposed **29 catalog entries** that advertise a reference-video or video-to-video type. That catalog signal is not enough to authorize a KingCam run. The actual provider contract must contain a usable video-input field, a recorded price, a hard ceiling, a timeout, and a governed review path.

**Official contract findings:** Pollo’s published schemas for **Vidu Q2 Pro**, **Kling Video O1**, and **Wan 2.7** expose image/reference-image input in their documented request bodies, not a usable source-video field for the KingCam reference. They are not eligible for a source-preserving KingCam proof on that evidence. Pollo’s catalog still confirms the existing Kling Omni video-reference route, but its API account will not return a usable exact quote; it remains blocked by the no-guess-cost gate.

**GoEnhance v1:** Its official API does accept `reference_video_url` and has a video-to-video endpoint, but it requires a separate account, API key, and prepaid token balance. It is a **candidate only**, not existing CreatorVault authority. Do not integrate or spend against it without Cameron’s architecture authority.

**Current truth:** Seedance is barred after two inspected quality failures; Runway is held after source rejection; Replicate Wan 2.7 is held after a real invalid-duration failure and a separately provider-cancelled stall; VACE remains circuit-open for black-output evidence; Topaz remains technical finishing only. No currently configured lane has earned an accepted KingCam full-body output.

Sources: https://docs.pollo.ai/openapi-filtered.json ; https://docs.pollo.ai/m/vidu/viduq2-pro.md ; https://docs.pollo.ai/m/kling-ai/kling-video-o1.md ; https://docs.pollo.ai/m/wanx/wan-v2-7.md ; https://docs.goenhance.ai/api-reference/video-to-video/generate


## 2026-08-18 — NO-CHARGE CANDIDATE SCANNER

CreatorVault now has an owner-only **audit-only** KingCam candidate check for the catalog-confirmed Pollo GoEnhance video-to-video entry. The check reads Pollo’s authenticated video-to-video model configuration only. It cannot create a draft, reserve credits, approve a job, obtain a single-use permit, submit media, or retry anything. A returned catalog row or price is not proof that the model is approved; it only decides whether an explicit future governed contract can be designed.


### Scanner repair — 2026-08-18

The first audit-only GoEnhance configuration check returned `404` because the scanner used `config/video/video2video/models`. Pollo’s own OpenAPI specifies `config/{generationType}/models`; the corrected no-charge path is `config/video2video/models`. This was a contract-path repair only. No draft, credit reservation, provider task, or media output was created.


### Scanner expansion — 2026-08-18

The authenticated Pollo video-to-video configuration endpoint answered successfully but did not contain the catalog’s GoEnhance label or price. The audit response is now expanded to return only a sanitized list of model names, model paths, and published credit/dollar fields from that read-only configuration. It still returns `eligibleForDraft: false` in every case and cannot create a provider task.


## 2026-08-18 — RUNWAY WORKSPACE REALITY CHECK

A read-only Runway workspace audit confirmed that the connected CreatorVault workspace currently exposes only **Gen-4 Turbo** for video. That model is image-to-video only in this workspace. Runway’s documented source-video editing paths require Aleph 2.0 or a video-to-video model; neither is available here. The workspace therefore has **no distinct executable source-video KingCam correction lane**. No Runway task, upload, credit charge, or retry occurred.

**Permanent rule:** model names in a provider tool description are not account access. Check the connected workspace’s available-model list before planning a provider proof.


## 2026-08-18 — POLLO MINIMAX H3 REFERENCE-VIDEO CONTRACT

Correction: MiniMax H3 is already inside the existing **Pollo API arsenal**. Do not create, configure, or spend through a separate GoEnhance account for this KingCam lane.

Pollo’s published OpenAPI exposes `POST /generation/minimax/minimax-h3/ref2video` with an explicit `refs` item of `type: "video"` and a required HTTPS `video` URL. The contract allows one output (`videoNum: 1`), a 5–15 second generation, `9:16`, and `768P` or `2K`. The actual KingCam source is 5.04 seconds, so the first proof must be 5 seconds only. This contract has no usable price recorded yet; the next required no-charge step is an authenticated Pollo estimate/configuration check. No MiniMax request, draft, credit reservation, or provider task has been created.

Sources: https://docs.pollo.ai/openapi-filtered.json ; local OpenAPI extraction path `/generation/minimax/minimax-h3/ref2video`.


## 2026-08-18 — POLLO MINIMAX H3 LIVE QUOTE-GATE RESULT

The owner-only live quote check used the real KingCam source, the published `minimax/minimax-h3/ref2video` request shape, one 5-second `9:16` `2K` output, and no provider submission. Pollo returned `404 Not found` for the model estimate endpoint. The authenticated `ref2video` model configuration did not expose an exact usable MiniMax H3 price through the current narrow record reader. The gate stopped correctly: **no governed draft, no approval, no single-use permit, no budget reservation, and no chargeable request were created.**

Corrective next step: inspect the authenticated `ref2video` configuration tree for MiniMax H3’s nested duration/resolution price records. Do not guess or substitute an outside-provider price. MiniMax remains audit-only until CreatorVault can record an exact Pollo account quote.


## 2026-08-18 — POLLO MINIMAX H3 LIVE ACCOUNT EVIDENCE

The authenticated Pollo `ref2video` configuration confirms that the account exposes the MiniMax H3 lane under the provider alias **`minimax-hailuo-03`**, model id `3048`, with the account description `Native audio & multi-shot sequences`. Pollo’s public OpenAPI confirms the canonical API route is `minimax/minimax-h3/ref2video` and supports one 5–15 second output, `9:16`, source-video refs, and `2K`.

Three no-charge account-price paths were tried and all stopped before media creation: the model estimate returned `404`; authenticated reference-video configuration exposes the lane but no price fields; Pollo’s documented `POST /credit` cost endpoint returned `403` to the API-key runtime. No draft, permit, reservation, provider task, or cost was created by any audit.

**Bounded next decision:** price discovery is technically exhausted for this account’s current Pollo API surface. A future MiniMax H3 proof may proceed only as an explicitly owner-directed manual-cap governed request, with one 5-second `9:16` `2K` output, a recorded fixed ceiling, before/after provider balance evidence, no automatic retry, provider-side timeout handling, and mandatory finished-video rejection for any identity, wardrobe, jewelry, shoe, anatomy, motion, or framing drift. It must not be labeled provider-quoted.


## 2026-08-18 — MINIMAX H3 MANUAL-CAP FREEZE REPAIR

The first owner-directed MiniMax H3 proof launch stopped **before provider submission** at CreatorVault’s frozen-budget gate. No MiniMax task was created and no credits were spent. Root cause: the documented manual 75-credit ceiling was stored as `manualCreditCap` but the existing explicit-owner-pilot budget reservation predicate requires the same value under `hardCreditCap`.

Exact correction: the MiniMax-only manual-cap draft now records both fields with the identical fixed 75-credit value. This does not open general Pollo spending; the predicate still requires one output, owner-directed pilot, no retry, source-video contract, and exact agreement between recorded estimate and permit ceiling.


## 2026-08-18 — KINGCAM MINIMAX H3 FULL-BODY PROOF RESULT

**Real provider run:** governed job `102`; motion request `397df349-f41f-4336-89b1-c92403b47a56`; Pollo MiniMax H3 (`minimax-hailuo-03` account alias); one five-second vertical `2K` output; one submission; no automatic retry. This used the verified CreatorVault source `https://creatorvault.live/videos/kingcam-hero-cam.mp4`.

**Spend evidence:** available Pollo credits were `898.75` before submission and `878.87` after. Actual provider cost recorded on the governed job: **19.88 credits**. The account change confirms the same 19.88-credit impact. The manual 75-credit ceiling held the request inside its stated bound; it was not provider-quoted.

**Source comparison:** the real source is a burgundy velvet suit with gold embroidery/trim, gold crown and jewelry, black shoes with gold detail, dark sofa interior, and a cigar in the right hand. The generated video preserved the source wardrobe color, crown, jewelry, shoes, full-body framing, and environment. The earlier black-wardrobe phrasing was incorrect and must never be used again as a rejection reason.

**Finished-video result:** **REJECTED at 60/100**. It failed the full-motion quality gate. There was no natural measured step, no meaningful weight shift, and movement became nearly frozen after the first second. The right hand/cigar also showed stiffness with slight shape/position morphing. This is a static-looking pose, not launch-grade KingCam full-body motion. It is excluded from public KingCam media.

**Permanent provider learning:** do not repeat the exact MiniMax H3 five-second, locked-front-frame KingCam source/prompt configuration as a public-proof route. It preserves identity better than the rejected Seedance runs but does not yet deliver the required natural full-body motion. Any future MiniMax decision must change the motion treatment deliberately, stay one-output and governed, and be judged against the same motion and hand-quality gate.


## 2026-08-18 — KINGCAM PRIVATE PRESENCE LOOP ARCHIVED

At Cameron’s direction, the rejected MiniMax H3 output is preserved for a narrow **private presence** use instead of being presented as clone proof. The exact reviewed output from governed job `102` was copied into CreatorVault-controlled storage as `KingCam — Private Presence Loop`.

**Durable asset evidence:** `https://creatorvault.live/uploads/content-vault/kingcam-private-presence-loop-102/KingCam-Private-Presence-Loop.mp4`; readable video response; 5.167 seconds; `1440×2560`; `2,544,011` bytes; fingerprint `25a9dcfff0e915a1cb6db6f16e622a256532bb120468b21dc6732a25c8a68f74`.

**Classification law:** This asset appears only in KingCam’s owner-only Media Vault as `private_presence_loop`. It is locked out of Body Cinema, Trailer Maker, public KingCam profile placement, Clone Guide placement, tool demonstrations, and any claim of proven full-body clone motion. It may be watched privately as a short KingCam mood/presence loop while the longer, genuinely demonstrable Clone Guide proof is built separately.


## 2026-08-18 — KINGCAM REAL-VOICE TOUR RUN INTENT

The real KingCam ElevenLabs voice preflight succeeded from the production runtime: voice ID `rwc11bXCBw5KydM4avHE`, name `KingCam`. A generic fallback voice is forbidden for this tour.

The first narration run is narrowly bounded to five short CreatorVault room segments: The Entry, Body Cinema, Caption Stage, Trailer Maker, and Clone Command. Each segment is direct ElevenLabs-only, stored under CreatorVault control, registered in the canonical audio system with `generated_voice` rights, and analyzed for timing/waveform data. No spoken segment may claim an unaccepted Body Cinema result, a finished trailer, earnings, or a clone capability that has not been proven.


## 2026-08-18 — KINGCAM REAL-VOICE TOUR ASSETS CREATED

CreatorVault created five short tour narrations directly with the verified **KingCam** ElevenLabs voice clone (`rwc11bXCBw5KydM4avHE`) and `eleven_multilingual_v2`. No Replicate, Kokoro, Forge, or generic fallback voice was used.

The five governed audio assets cover The Entry (6.870 seconds), Body Cinema (8.072 seconds), Caption Stage (6.870 seconds), Trailer Maker (7.602 seconds), and Clone Command (7.340 seconds). Every file was stored under CreatorVault control, registered as a canonical `voiceover` asset with `generated_voice` rights, and analyzed for waveform/timing data. A speech-to-text inspection of the opening narration confirmed the spoken words match the approved opening script.

The real-voice tour may describe only the live rooms and their verified limits. It may not present the private MiniMax presence loop as a Clone Guide, tool demo, or accepted full-motion proof.


## 2026-08-18 — KINGCAM VOICEOVER GUIDE REJECTED

Cameron’s live screenshot proved that the public KingCam Guide was wrong: it reused the same background clone video while playing KingCam’s real voice as a voiceover. That is **not** a full-body, full-motion KingCam clone leading a tool demonstration. The public voice overlay, its “KingCam speaking” control, and its narration URLs were removed from the Guide immediately.

The real ElevenLabs KingCam audio remains a private governed asset for a future scene where a visibly full-body moving KingCam clone actually delivers it. It must not be used as a disembodied public guide voice over recycled background footage. A valid future proof needs visible full-body natural motion, matched speech delivery, and real CreatorVault tool demonstration in the same finished watchable result.


## 2026-08-18 — KINGCAM WAN 2.7 SPOKEN-MOTION PROOF INTENT

Pollo’s current official OpenAPI documents `POST /generation/wanx/wan-v2-7` with a creator-owned image URL, `audioUrl` for audio-driven generation, 2–15 second length, and `1080P`. The selected KingCam proof is one 7-second output only, using the approved full-body KingCam image converted technically from the existing CreatorVault WebP without changing content, plus the durable verified KingCam ElevenLabs opening voice asset.

This is not source-video editing and must never be described as such. It is a new KingCam-only image-plus-real-voice full-body clone proof. The exact non-negotiable gate is visible crown-to-shoes body movement, real mouth-to-voice synchronization, a measured step and weight shift, stable cigar hand, and no recycled-video voiceover. The provider gives no usable account quote, so the one output remains under the existing owner-authorized fixed 75-credit cap with pre/post balance evidence, a 10-minute permit, no automatic retry, and permanent review.

Source: https://docs.pollo.ai/openapi-filtered.json, `/generation/wanx/wan-v2-7`.


## 2026-08-18 — DIRECT MULTIMODAL KINGCAM CLONE SOURCE FINDINGS

Official Pollo Happy Horse 1.0 Ref documentation (`https://docs.pollo.ai/m/happyhorse/happyhorse-1-0-ref.md`) documents a reference-guided route that accepts image, video, and audio reference objects together, 3–15 second duration, vertical 9:16, 720P/1080P, and one output. This is materially different from the failed Wan 2.7 image-plus-audio proof because it can condition both visible KingCam identity and an actual movement source alongside the direct KingCam voice.

The current CreatorVault KingCam hero source is not eligible as a motion reference: finished-video analysis found it AI-generated, only about four seconds, with abrupt turning, corrupted weight transfer, stiff hands/cigar, and artificial camera behavior. The existing KingCam/clone library review also found no verified continuous natural full-body movement source; the only real-looking Red Hat reel is chest-up with no lower-body motion. A public Instagram result for `_kingcamcam` was discovered but Instagram requires login in the agent browser, so it is not treated as a verified or retrieved source.

No new image, video, voice, or external account was created in this audit. A future Happy Horse proof may proceed only after a real natural full-body KingCam movement reference is found from existing CreatorVault media or directly retrieved consented public KingCam media.


## 2026-08-18 — HAPPYHORSE DIRECT FULL-BODY CLONE PROOF INTENT

The next KingCam motion lane is narrowly limited to `happyhorse-1-0/ref2video` through the existing Pollo API. Official Pollo documentation records that this route accepts image and audio references together, supports vertical 9:16 at 1080P, allows one output, and can run up to fifteen seconds. It is not a new provider account and it is not a public presentation layer.

The governed contract is fixed: one 15-second output; 75-credit hard ceiling; no automatic retry; direct authenticated KingCam ElevenLabs voice only; approved KingCam full-body PNG only; no source-video reuse because the previous hero motion clip was itself AI-corrupted and failed movement-reference inspection. The proof must reject itself unless KingCam remains visible crown-to-shoes, visibly speaks his direct voice with convincing lip timing, performs sustained natural steps and weight transfer, retains hands/cigar/wardrobe/crown/identity, and can honestly lead a CreatorVault demonstration. No public guide, background loop, voice overlay, or substitute page is authorized.


## 2026-08-18 — KLING OMNI MULTIMODAL CONTRACT CONFIRMED

Official Pollo Kling 3 Omni documentation (`https://docs.pollo.ai/m/kling-ai/kling-v3-omni.md`) explicitly documents `POST /generation/kling-ai/kling-v3-omni/ref2video` with 3–15 second duration, 9:16 at 720P/1080P/4K, one output, and `refs` that accept both image and audio reference objects in the same request. This is the correct existing-Pollo contract for direct full-body identity plus direct KingCam speech in one generation.

The preceding HappyHorse 1.0 request created no provider task and consumed no Pollo video credit. Its exact provider response was HTTP 400: `Happyhorse 1.0 does not support audio references`. It was not surfaced publicly and must not be retried with audio. The direct KingCam speech asset that was created for the attempt remains CreatorVault-owned, governed audio and can be reused as a Kling Omni audio reference without another ElevenLabs run.


## 2026-08-18 — KLING OMNI DIRECT FULL-BODY PROOF INTENT

The next and only active KingCam full-body proof is Pollo Kling 3 Omni `ref2video`, not HappyHorse. It uses the same already-created CreatorVault-owned direct KingCam ElevenLabs speech asset and approved full-body KingCam PNG. The contract is fixed to one 15-second vertical 1080P output, one result, 75-credit hard ceiling, no retry, direct audio/image references together, and full human-review rejection if sustained movement, direct mouth sync, hands/cigar, wardrobe/crown, full-body framing, or anatomy fail. HappyHorse 1.0 must not be attempted again with audio because Pollo returned a concrete non-chargeable HTTP 400 capability rejection.


## 2026-08-18 — VERIFIED PUBLIC KINGCAM PERFORMANCE SOURCE DISCOVERED

Public source: https://www.facebook.com/CWhite214/videos/kingcam-creatorvault-thedopestappintheworld-happybirthday%EF%B8%8F-dallas/1020891963980827/

The source page identifies the owner as Cameron White / `CWhite214`, the confirmed public profile links to `creatorvault.live`, and the post itself uses `#KingCam #CreatorVault #TheDopestAppInTheWorld #Dallas`. The public page exposes the clip as approximately 30 seconds. It is a candidate only—not yet accepted—until direct video inspection confirms KingCam is visible full-body with usable natural movement, hands, gait, and a clean enough performance segment. No asset has been copied, uploaded, or used for generation yet.


### Public KingCam video playback acquisition

The verified public `CWhite214` Facebook post opens in the agent browser and reports one real 30.0667-second video element with readyState 4. Facebook serves it through buffered playback (`/video/unified_cvc/`) rather than a plain `src` or directly extractable MP4 URL. The post remains a valid public-source candidate; direct media acquisition must use the page’s playback/download mechanism or an equivalent lawful public-source capture path, not a guessed static URL.


### Public KingCam performance capture

The verified public Cameron White / CWhite214 Facebook post was captured directly from its active public browser playback stream into a local 25.97-second WebM reference (`kingcam-public-performance-reference.webm`, 6,151,841 bytes). This is not a user re-upload, not generated media, and not a provider output. It remains a candidate until direct inspection confirms a usable full-body natural performance segment. Any CreatorVault ingestion must preserve this source provenance and remain owner-only until quality verification passes.


### Second public KingCam reel capture attempt

A second verified public Cameron White Facebook reel (`1532457721107475`) was captured from active public playback to `kingcam-public-performance-reference-2.webm`. The browser reported 4,867,498 bytes but a playback time of only 0.311 seconds at stop, so the capture must be inspected before it is treated as a valid 22-second source. It remains only a candidate with public-source provenance.


### Second public-reel audit status

Verified public Cameron White reel `1532457721107475` is a 22-second `persuasive214`-tagged public source. The first browser capture created a 4.87 MB WebM with invalid/undetermined duration and cannot be assessed or used. A later browser view showed playback advancing to 0:05 / 0:22 behind Facebook’s logged-out overlay. The reel must be captured cleanly from actual playback before it can be accepted or rejected as a KingCam performance driver.


### Third public KingCam candidate

Confirmed public Cameron White video `1414725663220560` is 2 minutes 54 seconds and is publicly playable in the agent browser. Its opening frame shows multiple people and an indoor setting; this has not yet been accepted as a KingCam driver source. Any future use must isolate a segment where KingCam is the only visible subject with clear full body, natural movement, and no conflicting speech.


## 2026-08-18 — REPLICATE OMNIHUMAN FULL-BODY CAPABILITY AUDIT

Official Replicate model page: https://replicate.com/bytedance/omni-human

The official model description states that ByteDance OmniHuman generates human video from a single human image plus motion signals, including audio-only, video-only, or combined audio-and-video conditioning. It explicitly supports portrait, half-body, and full-body image inputs, and its documentation calls out audio-driven speech, video driving, and combined audio/video controls. This is materially different from the failed Pollo image-to-video paths and remains within CreatorVault’s pre-existing **Replicate clone-only** boundary. It is only a candidate until CreatorVault verifies the authenticated model input schema, cost, duration, and outcome through the existing governed Replicate clone lane. It must never be exposed to Body Cinema.

The full-body performance-driver audit confirms the exact missing resource: a clean real 10–15 second KingCam full-body human performance clip. Existing owner-held assets and two inspected confirmed public Facebook clips did not meet this standard. The latest public candidate remains a 2:54 source that requires segment-level inspection; no unverified public clip has been imported to CreatorVault.


## 2026-08-18 — KINGCAM REPlicate OMNIHUMAN FULL-BODY PROOF INTENT

The existing CreatorVault **clone-only** Replicate account exposes `bytedance/omni-human`, version `566f1b03016969ac39e242c1ae4a39034686ca8850fc3dba83dceaceb96f74b2`. The authenticated model contract exposes exactly two inputs: `image` and `audio`. It is not available to Body Cinema.

The governed KingCam proof is limited to the approved full-body CreatorVault identity image `kingcam-crown-lounge-reference.png` and the direct KingCam ElevenLabs `entry.mp3` asset. It has one output, a manual **$2 USD** internal ceiling, a two-minute provider cancellation deadline, no automatic retry, and permanent reject gates for full-body visibility, natural locomotion and weight transfer, mouth-to-audio synchronization, identity, wardrobe/crown/jewelry continuity, cigar-hand integrity, anatomy, and real demonstration readiness.

Replicate returned no advertised fixed price in authenticated model metadata. This is therefore an explicitly owner-directed, manually capped clone-only test, not a provider-quoted request. Do not expand Replicate into Body Cinema or send another OmniHuman request if this exact proof fails.


### OmniHuman admission-gate correction — 2026-08-18

The first governed OmniHuman launch stopped before any Replicate prediction was created because the master governed provider allowlist admitted only the older Replicate Wan source-video model. The repair admits **only** `replicate/bytedance/omni-human` when all fixed KingCam clone-only conditions are simultaneously present: the exact mode, clone-only marker, owner-directed one-output pilot, no retry, source preservation, direct-voice-only rule, and Body Cinema exclusion. No provider request, charge, or output occurred before this correction.


### Public KingCam performance-source capture — 2026-08-18

Verified public source: `https://www.facebook.com/567398988/videos/1414725663220560/` — Cameron White / CWhite214, publicly shared April 4, 2025, duration 173.7 seconds. The agent browser played the public video without login and lawfully captured a local inspection-only playback segment from **66.52s to 78.49s** as `kingcam-public-performance-67s.webm` in the sandbox Downloads folder. This is a source audit artifact only. It is not ingested, generated, edited, or used as a clone driver until visual inspection verifies continuous real KingCam full-body gait, hands, direct speech, and usable framing.


### Verified public KingCam full-body driver candidate — 2026-08-18

Public consented source: `https://www.facebook.com/reel/1003038191646809/`, Cameron White / CWhite214, public reel. Screening found Cameron visibly full body from head to shoes with natural movement, visible hands, and direct speech across the 9-second clip. The agent browser played the public source without login and made an inspection-only local capture named `kingcam-public-fullbody-driver-candidate.webm`. The source must pass local visual analysis for real gait, stable anatomy, face clarity, direct speech, and enough quality before it can be ingested as a governed clone performance driver. It must never be used by Body Cinema.


### Public KingCam mirror-walk driver candidate — 2026-08-18

Verified public source: `https://www.facebook.com/CWhite214/videos/kingcam-the-kingofeverything-creatorvault/1441704243826008/`, Cameron White / CWhite214, public April 2025 post, duration 69.1 seconds. The public video visibly shows KingCam full body in a well-lit mirror setting at least around 00:11. The agent browser captured an inspection-only local first 15-second segment as `kingcam-public-mirror-walk-driver-candidate.webm`; it is not ingested, generated, or used until strict analysis confirms natural gait, face clarity, hand/foot integrity, stable full-body framing, and usable performance control. This source must remain excluded from Body Cinema.


### Public KingCam mirror-walk later-segment capture — 2026-08-18

After the first 15-second capture failed the driver gate, an inspection-only 24-second segment beginning at public-source timestamp 00:18 was captured from the same verified Cameron White video as `kingcam-public-mirror-walk-driver-later-segment.webm`. This capture exists solely to check whether a later continuous full-body natural-performance scene exists. It is not a generated asset, is not ingested into CreatorVault, and must be rejected if it lacks stable head-to-shoes framing, natural gait, clear identity, and usable hands/feet.

## 2026-08-18 — KINGCAM REAL PERFORMANCE DRIVER DECISION

- **What failed:** Image-plus-audio providers, including the clone-only OmniHuman lane, can return a static KingCam identity image with audio rather than a true body performance. A voice track over a frozen visual is never a KingCam clone, tour, or tool demonstration.
- **What changed:** CreatorVault now has a direct, owner-only **KingCam Performance Capture** path inside Clone Command. It records a real crown-to-shoes speaking-and-moving take in the platform, sends it through the canonical authenticated direct-upload route, receives a durable CreatorVault receipt, and registers it only as a clone performance driver.
- **Hard boundary:** Performance captures are classified `kingcam_performance_capture` / `kingcam_performance_driver`, cannot become Body Cinema sources, and cannot be represented as accepted clone output until a later proof visibly passes motion, speech, anatomy, and identity review.
- **Next-run rule:** Do not submit another full-body clone generation from only an image and audio. Use the verified real KingCam Performance Capture as the motion driver after it is actually recorded and durably stored.

## 2026-08-18 — KINGCAM CLONE TRAINING LIBRARY

The KingCam Clone system now records observed source truth in a durable clone-only training library. Existing synthetic KingCam motion clips are explicitly recorded as rejected for movement training; the approved four-second KingCam identity visual may support appearance only and cannot control body movement. Every training record carries its source kind, body visibility, observed motion and speech scores, defects, evidence, and a hard `driverReady` state. No clip can become a movement driver unless it is a verified real-camera KingCam performance, is reviewed for natural gait, hands, feet, voice, and full-body framing, and remains excluded from Body Cinema.

## 2026-08-18 — KingCam real-driver ingestion repair

The first secure ingestion of Cameron’s supplied real performance references reached the canonical direct-upload route but stopped before vault registration because `media_assets.source_type` accepts `upload`, not the stale `creator_upload` label. The route now records real originals as `upload` while the immutable `kingcam_performance_capture` feature classification continues to keep those clips clone-only and out of Body Cinema. This repair is storage-contract-only; it does not alter media, spend credits, or create a clone output.

## 2026-08-18 — Supplied KingCam real-footage library

Cameron supplied real KingCam footage directly. Three files were securely ingested into CreatorVault’s clone-only vault after canonical upload repair: `a61a35de-243b-4b6a-8128-08ea7087d2fd.mp4` holds 16.7 seconds of real lower-body walking and weight transfer but is rear-facing and silent; `IMG_9898.MOV` holds real direct speech and face-to-voice timing but is not crown-to-shoes; `IMG_9741.MOV` holds real hand, foot, posture, and body-mechanics detail but has camera tilts and no direct speech. Each is preserved as a specialized real-camera reference. None is a complete full-body speaking movement driver and none may be used alone to claim a finished clone.

## 2026-08-18 — Strongest supplied KingCam gait and speech references

Two more real Cameron-supplied clips were securely ingested into the clone-only vault. `bff8f30c-4116-4cfa-98b4-40c5cb7cd053.mp4` contains the strongest current body source: 62 continuous seconds of real full-body natural movement with visible hands and feet, but no direct KingCam speech. `43df2204-c955-4b9e-968a-3bde65e30fbe.mp4` contains the strongest current direct-speech source: real face, mouth, and delivery timing, but no crown-to-shoes body performance. The library must use both as specialized evidence and must not label either as a complete clone movement driver.

## 2026-08-18 — Wan Animate real-driver preflight

CreatorVault is auditing `wan-video/wan-2.2-animate-animation` only through the existing clone-only Replicate account. This is the first candidate that claims real driver-video motion transfer rather than image-and-audio animation. The audit must verify its exact authenticated input fields, real driver-video availability, advertised price, and version before any draft or provider prediction is permitted. No Body Cinema route is added and no media is generated by the preflight.
