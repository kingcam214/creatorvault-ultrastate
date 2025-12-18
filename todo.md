# CreatorVault Platform TODO

## KINGCAM PROOF GATE + COMMAND HUB DIRECTIVE

**RULE:** If a feature does not touch REAL users, REAL data, or REAL money, it DOES NOT EXIST.

### Phase 0 - Baseline Audit
- [ ] Identify current repo (creatorvault-platform)
- [ ] Print git rev-parse HEAD
- [ ] List server/client directories
- [ ] List existing DB tables via SQL
- [ ] Confirm Stripe env presence
- [ ] Create /tmp/kingcam-proof/ folder
- [ ] Create proof.jsonl log format

### Phase 1 - Proof Gate (Hard Enforcement)
- [ ] Build server/proofGate.ts with feature registry
- [ ] Implement assertFeatureReal() function
- [ ] Add UI enforcement (hide NOT REAL features)
- [ ] Create "NOT REAL" blocking page
- [ ] Write proof event for proofGate init

### Phase 2 - Command Hub
- [ ] Build server/routers/commandHub.ts
- [ ] POST /king/commands/run endpoint
- [ ] GET /king/commands/history endpoint
- [ ] Build client/src/pages/CommandHub.tsx
- [ ] Implement 9 required commands (marketplace, university, services, social, telegram, whatsapp, repurpose, podcast)
- [ ] Test 3 commands with DB + artifacts + proof.jsonl

### Phase 3 - Marketplace Real Money Lane
- [ ] Verify DB tables (products, orders, order_items, payments, users, creators)
- [ ] Product creation writes to DB
- [ ] Stripe Checkout integration (test mode)
- [ ] Webhook handler (checkout.session.completed)
- [ ] Mark orders paid + write payment records
- [ ] Calculate commission splits
- [ ] Digital product fulfillment + receipt artifacts
- [ ] Admin marketplace dashboard
- [ ] Creator storefront page
- [ ] My Orders page
- [ ] Execute real test purchase with full proof chain

### Phase 4 - Systems F/G/H Real
- [ ] Move F/G/H logic to server/services
- [ ] Add /api/marketplace/* routers
- [ ] Add /api/university/* routers
- [ ] Add /api/courses-services/* routers
- [ ] Wire UI pages to real DB
- [ ] Create 1 product, 1 course, 1 service via Command Hub
- [ ] Verify all appear in UI lists from DB

### Phase 5 - Telegram/WhatsApp Funnel Foundation
- [ ] Create telegram_bots, telegram_channels tables
- [ ] Register bot token (encrypted)
- [ ] Register channel ID
- [ ] Send test message endpoint
- [ ] Create funnel sequence records
- [ ] Build funnel runner
- [ ] Create whatsapp_providers table
- [ ] Support Twilio/Meta Cloud API
- [ ] Test send action
- [ ] Create 1 telegram funnel + runner job + proof log

### Phase 6 - Content Repurposing Foundation
- [ ] Create repurpose_jobs table
- [ ] Create repurpose_outputs table
- [ ] Build job runner (video/url/text → captions/hooks/shorts/posts)
- [ ] Generate 3 platform packs (TikTok/IG/YT) as JSON artifacts
- [ ] Integrate with Viral Optimizer
- [ ] Create 1 repurpose job + 3 output artifacts + DB storage

### Phase 7 - Podcast Sector Foundation
- [ ] Create podcast_shows table
- [ ] Create podcast_episodes table
- [ ] Create podcast_jobs table
- [ ] Support RSS ingest OR upload
- [ ] Build Podcast Studio page
- [ ] Generate clip ideas job (ties to Viral Optimizer)
- [ ] Create 1 show + 1 episode + 5 clip ideas + artifacts

### Phase 8 - Reality Dashboard + Acceptance
- [ ] Build /king/reality page
- [ ] Show all modules with REAL/NOT REAL status
- [ ] Display missing proof items
- [ ] Show last proof timestamp
- [ ] Add links to run commands that make features real
- [ ] All tests passing
- [ ] Generate screenshot/logs + route evidence

**OUTPUT REQUIREMENTS PER PHASE:**
- git show --stat
- commit hash
- push output
- test output
- proof.jsonl tail (last 20 lines)
- list of DB tables created + migrations applied


## 🎄 CHRISTMAS LAUNCH — LOCKED SCOPE

**RULE:** If it does NOT touch REAL users, REAL data, or REAL money by Christmas, it does NOT exist.

### 1. REAL USERS + REAL DATA (IMMEDIATE)
- [x] Telegram bot - broadcast functionality
- [x] Telegram bot - DM funnel
- [x] Telegram bot - collect emails, usernames, country, creator type
- [x] WhatsApp automation - opt-in flows
- [x] WhatsApp automation - creator funnels
- [x] Database tables: users, leads, creators
- [x] Store ALL bot data in database

### 2. REAL MONEY (IMMEDIATE)
- [x] Stripe webhook handler (checkout.session.completed)
- [x] Execute $1 test transaction
- [x] Orders table with real data
- [x] Payouts table
- [x] Commissions table with splits
- [ ] Transaction ID visible in admin UI
- [x] Proof artifact generated

### 3. CREATOR TOOLS — MUST BE USABLE
- [x] Viral Optimizer - real inputs
- [x] Viral Optimizer - real outputs
- [x] Viral Optimizer - real analytics
- [ ] Content repurposing - produce shorts files
- [ ] Content repurposing - produce captions files
- [ ] Podcast sector - ingest content (RSS or upload)
- [ ] Podcast sector - output clip files

### 4. LIVE / GO LIVE (CHRISTMAS REQUIREMENT)
- [ ] LIVE rooms functionality
- [ ] Chat in LIVE rooms
- [ ] Reactions in LIVE rooms
- [ ] Creator presence indicators
- [ ] NO placeholder UI - MUST FUNCTION

### 5. COMMAND HUB (CONTROL CENTER)
- [ ] Buttons execute API calls (not just navigation)
- [ ] Every button produces database effect
- [ ] Command history visible
- [ ] Proof artifacts logged

### 6. PROOF GATE (ENFORCEMENT)
- [ ] Block features without backend
- [ ] UI shows "NOT REAL" for blocked features
- [ ] Feature registry enforced
- [ ] Missing requirements displayed
