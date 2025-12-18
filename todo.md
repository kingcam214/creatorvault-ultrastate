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


## KINGCAM DIRECTIVE — BRAND + ROLE AI (2024-12-18)

### Brand System
- [x] Created BRAND_SYSTEM.md with color palette, typography, voice/tone
- [x] Applied CreatorVault purple (#8B5CF6) and pink (#EC4899) to theme
- [x] Updated index.css with OKLCH brand colors
- [x] Enforced dark theme with purple gradient
- [x] Brand system applied across all UI components

### Role-Aware AI Bot
- [x] Created aiBot.ts service with 4 role contexts (creator, recruiter, field_operator, ambassador)
- [x] Implemented generateBotResponse() with LLM integration
- [x] Implemented generateOnboardingPlan() for Day 1/2/7
- [x] Implemented generateScript() for recruitment/sales/onboarding/support
- [x] Created bot_events table for interaction logging
- [x] Created viral_analyses and viral_metrics tables
- [x] Built tRPC aiBot router with 5 endpoints
- [x] Integrated with Telegram (telegramAI.ts)
- [x] Integrated with WhatsApp (whatsappAI.ts)
- [x] Created AI Bot UI page (/ai-bot)
- [x] Added AI Assistant button to Home page
- [x] Wrote comprehensive test suite (12 tests)
- [x] All tests passing (40.42s)
- [x] Generated proof artifact (phase5-ai-bot-complete.md)

### Database Tables Added
- bot_events (7 columns, 4 indexes)
- viral_analyses (22 columns, 4 indexes)
- viral_metrics (13 columns, 1 index)

### Features Delivered
- Role-aware AI responses with context
- Onboarding plans (Day 1, 2, 7)
- Script generation (4 types)
- Telegram message handling with AI
- WhatsApp message handling with AI
- Conversation history tracking
- Database logging for all interactions
- Real-time chat interface
- Quick prompts and context display

### Next Steps
- [x] Test AI bot with real Telegram/WhatsApp messages
- [x] Generate proof artifacts
- [ ] Build Command Hub UI
- [ ] Implement Field Operator DR-specific logic
- [ ] Content Repurposing Pipeline
- [ ] Podcast Sector
- [ ] LIVE Rooms


## BOT #5 — COMMAND HUB + BOT #2 — CASHFLOW CHECKOUT (2024-12-18)

### Command Hub Backend
- [x] Create commandHub.ts service
- [x] Implement command execution with database logging
- [x] Use existing bot_events table for command history
- [x] Build tRPC commandHub router
- [x] Support 6 command types (product, course, service, telegram, whatsapp, viral)
- [x] Each command produces database effect
- [x] Log all executions to bot_events table

### Cashflow Checkout Bot
- [x] Create checkoutBot.ts service
- [x] Implement product catalog generation for Telegram/WhatsApp
- [x] Generate Stripe checkout session links
- [x] Process payment with webhook support
- [x] Record commissions (70% creator, 20% recruiter, 10% platform)
- [x] Log all transactions to orders/enrollments/sales tables
- [x] Build tRPC checkoutBot router

### Command Hub UI
- [x] Create /command-hub page
- [x] Build command execution interface
- [x] Display command history
- [x] Show real-time execution stats
- [x] Ensure every button executes API call (not just navigation)
- [x] Added Command Hub button to Home page

### Testing
- [ ] Test all 9 command types
- [ ] Execute real checkout flow
- [ ] Verify database effects
- [ ] Confirm commission splits
- [ ] Generate proof artifacts
