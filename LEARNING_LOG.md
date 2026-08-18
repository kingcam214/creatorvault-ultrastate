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
