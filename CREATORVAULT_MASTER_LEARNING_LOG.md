# CreatorVault Master Learning Log
**Last Updated:** 2026-04-01 | **Version:** 4.0 — Post-Vertical Pack Build**
**Rule:** Manus reads this document in full before every session. No exceptions.

---

## 0. THE CARDINAL RULES

1. **Read this document first. Every session. No exceptions.**
2. **Never repeat a known error.** Every error and its fix is logged below.
3. **Build before you code.** Understand the full system before touching a file.
4. **One canonical build command exists.** Use it. Never invent a new one.
5. **The architecture map is law.** If a file isn't in the map, it's deprecated.
6. **Verify on the live server before declaring success.**
7. **Never deliver the same file twice without fixing the root cause.**

---

## 1. SERVER FACTS (DO NOT GUESS)

| Property | Value |
|---|---|
| **Server IP** | `134.199.202.69` |
| **SSH Port** | `22` |
| **SSH User** | `root` |
| **SSH Password** | `KingCam214CreatorVault` |
| **Project Directory** | `/root/creatorvault` |
| **Entry Point** | `server/_core/index.ts` |
| **Build Output** | `dist/index.js` |
| **PM2 Process ID** | `11` (name: `creatorvault`) |
| **PM2 Process Name** | `creatorvault` |
| **Port** | `3000` |
| **Health Check** | `curl http://localhost:3000/health` → `{"ok":true}` |
| **Domain** | `creatorvault.live` (behind Cloudflare) |
| **Public Static Dir** | `/root/creatorvault/public/` |
| **Database** | MySQL (Railway) — credentials in server `.env` |
| **package.json type** | `"type": "module"` — **ESM project** |

---

## 2. THE CANONICAL BUILD COMMAND

```bash
cd /root/creatorvault
./node_modules/.bin/esbuild server/_core/index.ts \
  --bundle --platform=node --format=esm --outfile=dist/index.js \
  --packages=external \
  --loader:.node=file
```

**Why this exact command:**
- `--format=esm` is required because `package.json` has `"type": "module"`. CJS format (`--format=cjs`) produces `module is not defined in ES module scope` at runtime.
- `--packages=external` externalizes ALL `node_modules`. This is the only way to avoid `Dynamic require of "X" is not supported` errors from CJS packages (express, mysql2, drizzle-orm, form-data, depd, body-parser, etc.) being bundled into an ESM context.
- Do NOT use `--bundle` with individual `--external:package` flags — the list is infinite and will always be incomplete.
- Build time: ~190ms. Output: ~4MB. If output is 28-30MB, `--packages=external` was not used.
- This command is saved on the server at `/root/creatorvault/build.sh`.

**After every build, restart PM2:**
```bash
pm2 restart 11
sleep 15
curl http://localhost:3000/health
```

---

## 3. KNOWN ERRORS AND THEIR FIXES (NEVER REPEAT)

### Error 1: `module is not defined in ES module scope`
- **Cause:** Built with `--format=cjs` but `package.json` has `"type": "module"`. Node treats `.js` as ESM and rejects `module.exports`.
- **Fix:** Always use `--format=esm`. Never use `--format=cjs` for this project.

### Error 2: `Dynamic require of "X" is not supported`
- **Cause:** CJS packages bundled into ESM context. The `__require` shim esbuild generates does not work for all cases.
- **Fix:** Use `--packages=external`. This externalizes ALL node_modules and eliminates the problem entirely.

### Error 3: `SyntaxError: Identifier 'createRequire' has already been declared`
- **Cause:** Adding `--banner:js='import { createRequire } from "module"...'` when the bundle already declares `createRequire` internally.
- **Fix:** Do not use banner shims. Use `--packages=external` instead.

### Error 4: `Unexpected export at line 202`
- **Cause:** Syntax error in a TypeScript file (missing closing `}` brace) causes esbuild to misparse the file as CJS.
- **Fix:** Find and fix the syntax error first. Use `tsc --noEmit` to locate it.

### Error 5: `ERR_INVALID_URL: input: 'undefined'`
- **Cause:** A service initializes with a URL from an env variable that is `undefined` at startup.
- **Fix:** Check `.env` file on server for missing variables. The server's env vars are NOT in the git repo.

### Error 6: PM2 process shows `online` but port 3000 is not bound
- **Cause:** Server crashes after PM2 marks it online. PM2 marks online immediately on process start, before the server binds.
- **Fix:** Always `sleep 15` after `pm2 restart`, then check `ss -tlnp | grep 3000` AND `curl http://localhost:3000/health`.

### Error 7: `tRPC procedure returns 404`
- **Cause:** Router is registered in the wrong `routers.ts`. There are TWO router files:
  - `server/routers.ts` — used by `server/_core/index.ts` (the actual entry point)
  - `server/_core/routers.ts` — NOT used by the main entry point
- **Fix:** Always register new routers in `server/routers.ts`.

### Error 8: Build succeeds but new code is not in the bundle
- **Cause:** The build ran against a stale file, or the wrong entry point was used.
- **Fix:** After build, run `grep -c 'newFunctionName' dist/index.js` to confirm the new code is present.

### Error 9: Git push doesn't update the server
- **Cause:** The server's git remote is `cv-ultrastate` (a different repo than `creatorvault-ultrastate`). The auto-sync process (`cv-git-sync`, PM2 id 1) syncs from a different branch/remote.
- **Fix:** For immediate updates, SCP files directly to the server. For persistent changes, commit to the correct repo and let the sync run, OR manually `git pull` on the server.

### Error 10: HTML file with tabs appears to have missing sections when pasted into Perplexity
- **Cause:** Perplexity reads raw HTML source. Tab content is hidden by `display:none` CSS until a tab is clicked. Perplexity cannot click.
- **Fix:** Build documents as single-scroll pages with all sections always visible (`display:block`). Never use tab-based navigation for documents that will be reviewed via Perplexity.

---

## 4. FILE SYSTEM MAP (CANONICAL)

### Server
```
/root/creatorvault/
├── server/
│   ├── _core/
│   │   ├── index.ts          ← ENTRY POINT (always use this)
│   │   └── routers.ts        ← NOT USED by entry point (do not register here)
│   ├── routers.ts            ← CANONICAL router registry (register all new routers here)
│   ├── db.ts                 ← Database connection
│   ├── services/             ← All service files
│   │   ├── creatorIntelligenceEngine.ts  ← Unified scraper+audit hub
│   │   ├── socialScraperService.ts       ← Real scraper (YouTube/TikTok/IG/X)
│   │   ├── socialMediaAudit.ts           ← Audit logic
│   │   ├── verticalConfig.ts             ← Vertical preset definitions
│   │   ├── verticalPackService.ts        ← Pack bundle engine
│   │   └── [other services]
│   └── routers/              ← All router files
│       ├── verticalPackRouter.ts         ← NEW: vertical pack endpoint
│       ├── viralOptimizerRouter.ts       ← CANONICAL viral optimizer
│       ├── campaignRouter.ts             ← Trailer Studio + renderTrailer
│       ├── presentationEmpireRouter.ts   ← Presentation Builder
│       ├── socialScraperRouter.ts        ← Exposes getCreatorContext
│       └── [other routers]
├── client/src/
│   ├── App.tsx               ← Route registry
│   ├── pages/
│   │   ├── VerticalPackLauncher.tsx      ← NEW: /vertical-pack
│   │   ├── ViralOptimizerPage.tsx        ← CANONICAL viral optimizer page
│   │   ├── LaunchTrailerStudio.tsx       ← Trailer Studio
│   │   └── [other pages]
│   └── components/
├── public/                   ← Static files served at creatorvault.live/*
│   └── architecture.html     ← Architecture map (live URL)
├── dist/
│   └── index.js              ← Built bundle (ESM, ~4MB with --packages=external)
├── build.sh                  ← CANONICAL build script
└── package.json              ← "type": "module" — ESM project
```

---

## 5. PM2 PROCESS MAP

| ID | Name | Script | Purpose | Status |
|---|---|---|---|---|
| 11 | `creatorvault` | `dist/index.js` | Main API server | Must be ONLINE |
| 1 | `cv-git-sync` | — | Auto-syncs git changes | Background |
| 8 | `cv-swarm-monitor` | — | Swarm AI monitor | Background |
| 12 | `mediacore-python` | — | Python media processor | Background |

**Never delete process 11.** If it's stopped, use `pm2 start 11` then `pm2 restart 11`.

---

## 6. ROUTER REGISTRY (CANONICAL KEYS IN `server/routers.ts`)

All tRPC keys registered and confirmed in the live bundle:

**Media & Video:** `upload`, `batchUpload`, `smartAlbum`, `mediaAssets`, `videoStudio`, `videoLab`, `brollGenerator`, `animatedFlyer`, `thumbnail`, `subtitlePipeline`

**Campaigns & Trailers:** `campaign` (includes `renderTrailer`, `createProject`, `listProjects`, `getProject`, `updateProject`)

**Presentation:** `presentationEmpire`, `presentationBuilder`

**Social & Intelligence:** `socialScraper`, `socialMediaAudit`, `viralOptimizer`, `realGPT`, `emma`, `scriptGenerator`

**Vertical Packs:** `verticalPack` (NEW — `listVerticals`, `generatePack`, `getPackStatus`, `getPackResult`)

**Distribution:** `contentScheduler`, `telegramBot`, `whatsapp`, `multiPlatformPost`, `vaultDrops`

**Commerce:** `stripe`, `marketplace`, `vaultPay`, `payouts`, `loyalty`

**Community:** `creatorProfile`, `vaultSpace`, `vaultLive`, `fanSubscribe`

**Admin:** `kingDashboard`, `ownerCockpit`, `kingAuthority`, `killSwitch`, `moderation`, `contentProtection`

**Cultural:** `culturalTemplates`, `dominicanSector`, `podcast`, `brandAffiliations`

---

## 7. DATABASE TRUTH (LIVE ROW COUNTS — 2026-04-01)

| Table | Rows | Status |
|---|---|---|
| `users` | 5 | LIVE |
| `subscriptions` | 5 | LIVE (real Stripe revenue) |
| `payments` | 0 | BROKEN — Stripe webhook not writing here |
| `media_assets` | 0 | LIVE-WEAK — schema correct, no UI to populate |
| `media_jobs` | 0 | LIVE-WEAK |
| `social_audits` | 4+ | LIVE (real data, real follower counts) |
| `trailer_projects` | 0 | LIVE-WEAK — engine live, no media picker UI |
| `campaign_projects` | 0 | LIVE-WEAK |
| `vertical_packs` | 0 | NEW — schema needs migration |
| `courses` | 0 | PLANNING |
| `marketplace_listings` | 0 | PLANNING |

---

## 8. CRITICAL GAPS (PRIORITY ORDER)

1. **Media Picker UI** — `trailer_projects` has 0 rows because creators cannot browse `media_assets` and pick clips for scenes. This is the single highest-leverage fix. Build: `MediaPickerModal.tsx` that queries `mediaAssets.list` and lets user select files for each scene slot.

2. **Stripe Webhook → payments table** — 5 subscriptions exist, 0 payment records. Fix: verify `stripe.webhooks.constructEvent` handler writes to `payments` table on `invoice.payment_succeeded`.

3. **Vertical Pack DB Migration** — `vertical_packs` table needs to be created. Run: `CREATE TABLE vertical_packs (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, vertical_id VARCHAR(50), status VARCHAR(20), artifacts JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`.

4. **Creator Intelligence Engine Cache** — 15-minute in-memory cache works but resets on PM2 restart. Persist to Redis or DB for production.

5. **YouTube Scraper Stability** — Uses regex fallback for subscriber counts. Monitor for YouTube HTML changes.

---

## 9. VERTICAL PACK SYSTEM (NEW — 2026-04-01)

**What it is:** A system that generates a complete launch package for a creator based on their vertical (niche/content type).

**Files:**
- `server/services/verticalConfig.ts` — 5 vertical presets (YOUTUBE_EDUCATOR active, 4 pending)
- `server/services/verticalPackService.ts` — engine that runs all 6 artifacts
- `server/routers/verticalPackRouter.ts` — tRPC router
- `client/src/pages/VerticalPackLauncher.tsx` — frontend at `/vertical-pack`

**6 Artifacts per pack:**
1. Social Audit Summary (from `creatorIntelligenceEngine`)
2. Flagship Trailer (from `campaignRouter.renderTrailer`)
3. 3 Short Teasers (from `kingcamScriptGenerator` + video assembly)
4. Launch Deck (from `presentationEmpireRouter.generateDeck`)
5. Landing Page Block (from `realGPT` with educator template)
6. DM/Email Script (from `realGPT` with educator DM template)

**Live endpoint:** `GET /api/trpc/verticalPack.listVerticals` → returns all 5 verticals with status.

---

## 10. SESSION LESSONS (CHRONOLOGICAL)

| Session | Lesson |
|---|---|
| Build Fix 1 | `socialMediaAudit.ts` had missing `}` brace → caused `Unexpected export` esbuild error. Always run `tsc --noEmit` before building. |
| Build Fix 2 | `auditId` was `NaN` because Drizzle MySQL returns `[ResultSetHeader, FieldPacket[]]` — `insertId` is at `result[0].insertId`. |
| Build Fix 3 | YouTube subscriber count was 0 because YouTube changed from `c4TabbedHeaderRenderer` to `pageHeaderRenderer`. Fixed with regex fallback on raw JSON. |
| Architecture 1 | Two `routers.ts` files exist. Only `server/routers.ts` is used by the entry point. Never register in `server/_core/routers.ts`. |
| Architecture 2 | Viral Optimizer had 7 deprecated files still registered. Consolidated to one canonical router. |
| Architecture 3 | `presentationEmpireRouter` was calling scraper directly. Rewired to use `creatorIntelligenceEngine`. |
| Build Fix 4 | `--format=cjs` fails because `package.json` has `"type": "module"`. Must use `--format=esm`. |
| Build Fix 5 | `--format=esm` with bundled CJS packages fails with `Dynamic require`. Fix: `--packages=external`. |
| Build Fix 6 | `--banner:js` shim for `createRequire` fails because bundle already declares it. Fix: `--packages=external`. |
| Document Fix 1 | Tab-based HTML documents appear to have missing sections when read by Perplexity (reads raw HTML). Always build as single-scroll documents. |
| Build Fix 7 | `--packages=external` reduces build time from 1700ms to 190ms and output from 30MB to 4MB. This is the correct build mode for this server. |
