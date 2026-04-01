# CreatorVault Pre-Session Checklist
**Manus reads this before every session. No exceptions.**

---

## STEP 1 — VERIFY SERVER IS LIVE

```bash
sshpass -p 'KingCam214CreatorVault' ssh -o StrictHostKeyChecking=no -p 22 root@134.199.202.69 "
  ss -tlnp | grep 3000
  curl -s http://localhost:3000/health
  pm2 status
"
```

Expected: Port 3000 bound. Health returns `{"ok":true}`. PM2 process 11 `online`.

If server is down: `pm2 restart 11 && sleep 15 && curl http://localhost:3000/health`

---

## STEP 2 — PULL LATEST CODE

```bash
cd /home/ubuntu/creatorvault-ultrastate && git pull
```

---

## STEP 3 — KNOW THE BUILD COMMAND BEFORE TOUCHING CODE

```bash
# THE ONLY CORRECT BUILD COMMAND:
cd /root/creatorvault
./node_modules/.bin/esbuild server/_core/index.ts \
  --bundle --platform=node --format=esm --outfile=dist/index.js \
  --packages=external \
  --loader:.node=file
```

Or on server: `bash /root/creatorvault/build.sh`

---

## STEP 4 — KNOW WHERE TO REGISTER NEW ROUTERS

- **Backend router:** Add to `server/routers.ts` (NOT `server/_core/routers.ts`)
- **Frontend route:** Add to `client/src/App.tsx`
- **New page:** Create in `client/src/pages/`

---

## STEP 5 — VERIFY AFTER EVERY BUILD

```bash
# 1. Check new code is in bundle
grep -c 'newFunctionName' /root/creatorvault/dist/index.js

# 2. Restart and wait
pm2 restart 11 && sleep 15

# 3. Verify server is up
ss -tlnp | grep 3000
curl http://localhost:3000/health

# 4. Test the endpoint
curl 'http://localhost:3000/api/trpc/routerKey.procedureName?input=%7B%7D'
```

---

## PLATFORM DOMAIN MAP (QUICK REFERENCE)

| Domain | Key Systems | Status |
|---|---|---|
| **Media Hub** | Upload, Batch Upload, Smart Albums, media_assets table | LIVE-WEAK (0 rows — needs media picker UI) |
| **Video / Creative** | Trailer Studio, Video Studio, VideoLab, B-Roll, Animated Flyer | LIVE-WEAK (engine live, no UI to trigger) |
| **Vertical Packs** | verticalPackRouter, verticalConfig, VerticalPackLauncher | NEW — live endpoint, DB migration needed |
| **Intelligence** | Creator Intelligence Engine, Social Scraper, Social Audit, Viral Optimizer | LIVE (real data, 4+ audits in DB) |
| **Presentation** | Presentation Empire, Presentation Builder | LIVE-WEAK |
| **Distribution** | 5 Telegram Bots, WhatsApp, Content Scheduler | LIVE (bots active) |
| **Commerce** | Stripe (5 subscriptions), Marketplace, VaultPay | LIVE-WEAK (payments table broken) |
| **Community** | VaultSpace, VaultLive, Creator Profiles | PLANNING |
| **Admin / King** | King Dashboard, Owner Cockpit, Kill Switch | LIVE (internal only) |
| **Cultural** | Dominican Sector, Podcast, Cultural Templates | PLANNING |

---

## CRITICAL GAPS TO NEVER FORGET

1. **Media Picker UI** — highest leverage fix. No media_assets rows = no trailer renders.
2. **Stripe → payments table** — webhook not writing. 5 subscriptions, 0 payment records.
3. **vertical_packs DB table** — needs `CREATE TABLE` migration before pack runs can persist.

---

## DOCUMENT DELIVERY RULES

- **Never use tab-based HTML** for documents reviewed via Perplexity. Always single-scroll.
- **Always verify column counts** with BeautifulSoup script before delivering matrix documents.
- **Always attach the file** — never just send a URL unless explicitly requested.
- **Never send the same file twice** without fixing the root cause of the complaint.
