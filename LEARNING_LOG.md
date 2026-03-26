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
