# CREATORVAULT BIBLE v1.0
## THE MASTER HANDOFF DOCUMENT FOR ALL AI AGENTS

> **PRE-READ REQUIREMENT:** Before writing a single line of code, you MUST read this entire document. This is the authoritative source of truth for the CreatorVault platform. Context loss is the number one failure mode. Re-read this document at the start of every session.

## SECTION 1 — PLATFORM IDENTITY

### What is CreatorVault?
CreatorVault is the ultimate Creator Operating System. It is a unified platform combining a social network, AI studio, and monetization engine. It was built to solve the problem of fragmented creator tools and unfair revenue splits (e.g., Twitch, YouTube, OnlyFans taking 50%).

### The Vision
- **Core Identity:** The Creator Operating System
- **Target Markets:** US, Dominican Republic (DR), Haiti
- **Language:** Multilingual support (English, Spanish, Haitian Creole)
- **Revenue Model:** Creators keep 85% of everything (tips, subscriptions, product sales). The platform takes 15%.

### The Visual Law
- **Theme:** Dark mode by default
- **Colors:** Background `#0A0A0A`, Accents `#00D9FF`, Bold White text
- **Aesthetic:** $5K+ production standard. Think Apple × Dior × NBA × futuristic OS.
- **Rule:** No MVP. No placeholders. No stubs. Production grade only.

### Ownership
- **Owner:** Cameron Lee White (KingCam)
- **User IDs:** `6` and `33`
- **Email:** `kingcam214@gmail.com`

## SECTION 2 — LIVE INFRASTRUCTURE

### Server Details
- **VPS IP:** `134.199.202.69`
- **OS:** Ubuntu 24.04
- **Domain:** `creatorvault.live`
- **Disk Usage Warning:** Currently at >90% capacity. DO NOT create large files unnecessarily. Clean up after yourself.

### Tech Stack
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS
- **Backend:** Node.js + Express + tRPC
- **Database:** MySQL (via Drizzle ORM)
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx

### Key Commands & Paths
- **Build Command:** `cd /root/creatorvault && npm run build`
- **Restart Command:** `pm2 restart ecosystem.config.cjs --update-env`
- **PM2 Process:** `id 21` (or `18`), name `creatorvault`
- **Server Entry:** `server/_core/index.ts`
- **Client Entry:** `client/src/App.tsx`
- **Router Registry:** `server/routers.ts`
- **Router Directory:** `server/routers/`
- **GitHub Repo:** `cv-ultrastate`

## SECTION 3 — CRITICAL RULES THAT MUST NEVER BE VIOLATED

1. **RULE 1:** Never delete or remove any router from `server/routers.ts` without first confirming the file exists in `server/routers/`. Deleting imports of files that exist causes `ERR_MODULE_NOT_FOUND` crashes that take the entire platform down.
2. **RULE 2:** Never run `git reset --hard` without explicit written permission from Cam. This wipes uncommitted work permanently.
3. **RULE 3:** Never create placeholder or stub router files and leave them empty. Every router must have at least one valid procedure or the build will fail silently in production.
4. **RULE 4:** All AI calls must use the `runKingCamLLM` wrapper — never raw OpenAI or Anthropic API calls directly.
5. **RULE 5:** Stripe is in LIVE mode. Never touch payment routes without explicit instruction.
6. **RULE 6:** Owner gates — userId `6` and `33` only for owner-level features. Never remove these gates.
7. **RULE 7:** Before any build, run: `npm run build 2>&1 | grep "Could not resolve"` to catch all missing imports first. Fix every missing import before attempting a full build.
8. **RULE 8:** Never mark a task complete without browser-visible proof. `curl` returning 200 is not proof. A screenshot of the page rendering is proof.
9. **RULE 9:** Reality Bot at `/root/creatorvault/testing/reality-bot.mjs` is the authoritative truth source. Run it before and after any major change.
10. **RULE 10:** Never push broken code to GitHub. Build must pass with zero errors before any commit.
11. **RULE 11:** `server/routers.ts` is the single most critical file on the platform. Any edit to it must be surgical. Read the entire file before touching it. Never add an import without the corresponding file existing.
12. **RULE 12:** The platform runs on `tsx` via PM2, not compiled dist. The build command compiles the frontend only. The server runs from source via `tsx`.

## SECTION 4 — WHAT BROKE THE PLATFORM ON APRIL 14-18 2026 AND HOW IT WAS FIXED

### What Happened
Agents added over 130 imports to `server/routers.ts` for router files that did not actually exist on the disk. Because the server runs via `tsx` (source mode), it attempted to resolve these imports on startup.

### The Symptoms
- PM2 process showed as 'online' but was constantly crash-looping (restarting hundreds of times).
- Memory usage was abnormally low (e.g., 640kb instead of ~300MB).
- The Nginx reverse proxy returned `502 Bad Gateway` because the Node process was never successfully binding to port 3000.
- The error logs showed `ERR_MODULE_NOT_FOUND` for files like `./routers/adminRouter`.

### The Fix
1. Identified that the live server was missing ~130 router files that were referenced in `routers.ts`.
2. Discovered that the `dist/index.js` build was broken (868KB instead of 4.6MB) due to missing `--packages=external` flags.
3. Restored the working frontend `dist/public` from the April 15 backup.
4. Fixed the PM2 environment loading by ensuring `.env` variables (like `OPENAI_API_KEY`) were properly passed to the process.
5. Restarted PM2 and verified the site rendered correctly in the browser.

### The Lesson
**ALWAYS verify every import in `server/routers.ts` has a corresponding file before restarting PM2.** Never assume a file exists just because an agent wrote code to import it.

## SECTION 5 — COMPLETE ROUTER REGISTRY

This is the definitive list of all routers imported in `server/routers.ts` and their current status on the VPS disk.

```text
=== ROUTER AUDIT RESULTS ===

Total imports checked: 243
Present: 67
Missing: 173

--- MISSING FILES ---
  MISSING  | ./routers/adminRouter
  MISSING  | ./routers/cloneLabRouter.js
  MISSING  | ./routers/agentTracker
  MISSING  | ./routers/aiAffiliateOptimizer.js
  MISSING  | ./routers/aiAudienceClone.js
  MISSING  | ./routers/aiCloneArmy
  MISSING  | ./routers/aiContentImport
  MISSING  | ./routers/aiEmpireOrchestrator
  MISSING  | ./routers/aiEmpireRouter.js
  MISSING  | ./routers/aiEngagementMultiplier
  MISSING  | ./routers/aiMonetizationHunter.js
  MISSING  | ./routers/aiOnboardingAssistant
  MISSING  | ./routers/aiOnboardingConcierge.js
  MISSING  | ./routers/aiPlatformDominator
  MISSING  | ./routers/aiRevenueTracker.js
  MISSING  | ./routers/aiScriptSurgeon
  MISSING  | ./routers/aiTrendProphet.js
  MISSING  | ./routers/animatedFlyerRouter.js
  MISSING  | ./routers/apparelRouter
  MISSING  | ./routers/artistMusic.js
  MISSING  | ./routers/autoCreditRepairExecutor.js
  MISSING  | ./routers/grants/autoGrantApplicatorRouter.js
  MISSING  | ./routers/autoHousingFinder.js
  MISSING  | ./routers/brandDealEmailAutomation.js
  MISSING  | ./routers/kingcamEditorTrpc.js
  MISSING  | ./routers/creatorVideoEditorRouter
  MISSING  | ./routers/vaultspaceAutomation.js
  MISSING  | ./routers/standaloneAuth.js
  MISSING  | ./routers/stripeIntegration.js
  MISSING  | ./routers/aiRevenueOptimizer.js
  MISSING  | ./routers/brandEngine.js
  MISSING  | ./routers/monetizationOptimizer.js
  MISSING  | ./routers/batchGeneration
  MISSING  | ./routers/brandCoordination
  MISSING  | ./routers/brandDNARouter
  MISSING  | ./routers/brandExtraction
  MISSING  | ./routers/brollGenerator.js
  MISSING  | ./routers/businessCardsRouter
  MISSING  | ./routers/campaignRouter
  MISSING  | ./routers/categoryCreator
  MISSING  | ./routers/channelsRouter
  MISSING  | ./routers/cloneSuccessSystem
  MISSING  | ./routers/cloneToursRouter.js
  MISSING  | ./routers/collabAI.js
  MISSING  | ./routers/commandHubV2Router
  MISSING  | ./routers/commentRouter.js
  MISSING  | ./routers/contentRepurposing
  MISSING  | ./routers/mediaCoreRouter.js
  MISSING  | ./routers/crossVerticalMarketplace
  MISSING  | ./routers/culturalRouter
  MISSING  | ./routers/dancerOnboardingRouter
  MISSING  | ./routers/demos.js
  MISSING  | ./routers/designDepartment
  MISSING  | ./routers/designDepartmentWeaponized.js
  MISSING  | ./routers/designerOSRouter.js
  MISSING  | ./routers/dubbingAI.js
  MISSING  | ./routers/emmaContentRouter.js
  MISSING  | ./routers/emmaDashboardRouter.js
  MISSING  | ./routers/emmaLeadsRouter.js
  MISSING  | ./routers/emmaOsRouter
  MISSING  | ./routers/emmaCaseStudyRouter.js
  MISSING  | ./routers/recruitmentWeaponRouter.js
  MISSING  | ./routers/chicasEmpireRouter
  MISSING  | ./routers/competitorIntelRouter.js
  MISSING  | ./routers/appleQRouter
  MISSING  | ./routers/emmaPaymentsRouter.js
  MISSING  | ./routers/empireBrainIntegrationRouter
  MISSING  | ./routers/empireBrain
  MISSING  | ./routers/empireState
  MISSING  | ./routers/empireWeeklyBriefRouter.js
  MISSING  | ./routers/exploreRouter
  MISSING  | ./routers/flyerAnalyticsRouter
  MISSING  | ./routers/flyerBatchExportRouter
  MISSING  | ./routers/flyerComposerRouter.js
  MISSING  | ./routers/flyerGeneratorEnhanced
  MISSING  | ./routers/flyerStudioV2Router
  MISSING  | ./routers/followRouter.js
  MISSING  | ./routers/greatest-show
  MISSING  | ./routers/greatestShowStudioRouter
  MISSING  | ./routers/guidedModeRouter
  MISSING  | ./routers/hollywoodReplacementRouter
  MISSING  | ./routers/imageLabRouter.js
  MISSING  | ./routers/kingcamCategoryCreating.js
  MISSING  | ./routers/kingcamCloneRouter.js
  MISSING  | ./routers/kingcamPerks.js
  MISSING  | ./routers/kingcamVault.js
  MISSING  | ./routers/kingframe
  MISSING  | ./routers/liveSessionScheduler
  MISSING  | ./routers/markCubanAgent.js
  MISSING  | ./routers/memberOnboarding
  MISSING  | ./routers/mercedesAcquisitionAgent
  MISSING  | ./routers/messageRouter.js
  MISSING  | ./routers/musicAI.js
  MISSING  | ./routers/musicLibrary.js
  MISSING  | ./routers/nfcCards
  MISSING  | ./routers/notificationRouter.js
  MISSING  | ./routers/onboarding
  MISSING  | ./routers/onboardingV2Router
  MISSING  | ./routers/onlyfansIntegration.js
  MISSING  | ./routers/ownerCockpitRouter
  MISSING  | ./routers/podcastOSRouter.js
  MISSING  | ./routers/postRouter.js
  MISSING  | ./routers/presentationBuilderRouter.js
  MISSING  | ./routers/profileRouter.js
  MISSING  | ./routers/realEstateEmpireAgent.js
  MISSING  | ./routers/realGPT.js
  MISSING  | ./routers/scriptAI.js
  MISSING  | ./routers/scriptToVideoRouter
  MISSING  | ./routers/simpleAuth
  MISSING  | ./routers/smartAlbumRouter.js
  MISSING  | ./routers/smartCaptions.js
  MISSING  | ./routers/socialScraperRouter
  MISSING  | ./routers/socialMediaAutoPoster
  MISSING  | ./routers/socialLinkRouter
  MISSING  | ./routers/storefrontRouter
  MISSING  | ./routers/storiesCompilationRouter
  MISSING  | ./routers/storyRouter
  MISSING  | ./routers/studioSlotsRouter
  MISSING  | ./routers/telegramBot
  MISSING  | ./routers/telegramHubRouter
  MISSING  | ./routers/telegramWebhookRouter
  MISSING  | ./routers/templateRecommendations
  MISSING  | ./routers/thumbnailGenerator.js
  MISSING  | ./routers/universityV2Router
  MISSING  | ./routers/vaultAnalyticsRouter.js
  MISSING  | ./routers/vaultCommunityRouter.js
  MISSING  | ./routers/vaultCreatorToolsRouter.js
  MISSING  | ./routers/vaultCultureRouter.js
  MISSING  | ./routers/vaultDropRouter.js
  MISSING  | ./routers/vaultLovesRouter.js
  MISSING  | ./routers/vaultMarketRouter.js
  MISSING  | ./routers/vaultMomentRouter.js
  MISSING  | ./routers/vaultPassRouter.js
  MISSING  | ./routers/vaultRemixRouter
  MISSING  | ./routers/vaultRiseRouter.js
  MISSING  | ./routers/vaultSnapRouter.js
  MISSING  | ./routers/vaultliveProRouter
  MISSING  | ./routers/vaultmarket
  MISSING  | ./routers/vaultremix
  MISSING  | ./routers/vaultspace
  MISSING  | ./routers/vaultu
  MISSING  | ./routers/vaultxRouter
  MISSING  | ./routers/verticalWizard
  MISSING  | ./routers/videoEditorRouter.js
  MISSING  | ./routers/videoLabProRouter
  MISSING  | ./routers/videoLabRouter
  MISSING  | ./routers/videoLabAgentRouter.js
  MISSING  | ./routers/videoProcessing.js
  MISSING  | ./routers/videoStudioV2Router
  MISSING  | ./routers/viralOptimizerRouter
  MISSING  | ./routers/waitlistEngine.js
  MISSING  | ./routers/whatsappBot
  MISSING  | ./routers/whatsappContentRouter.js
  MISSING  | ./routers/kingcamImportRouter.js
  MISSING  | ./routers/kingcamBrainRouter.js
  MISSING  | ./routers/aiVideoDirector.js
  MISSING  | ./routers/vaultLiveEnhanced.js
  MISSING  | ./routers/viralMechanics.js
  MISSING  | ./routers/eventBus.js
  MISSING  | ./routers/viralPerformance.js
  MISSING  | ./routers/aiContentDirector.js
  MISSING  | ./routers/aiDealCloser.js
  MISSING  | ./routers/botMonetization.js
  MISSING  | ./routers/brandDealsRouter.js
  MISSING  | ./routers/marketplace/cryptoPayouts.js
  MISSING  | ./routers/devguardian-router.js
  MISSING  | ./routers/multiTenant.js
  MISSING  | ./routers/oauthProxy.js
  MISSING  | ./routers/marketplace/productAnalyticsAI.js
  MISSING  | ./routers/uci.js
  MISSING  | ./routers/university/categoryCreatorRouters.js
  MISSING  | ./routers/agentOrchestratorRouter
  MISSING  | ./routers/videoEnhanceRouter

--- PRESENT FILES ---
  EXISTS   | ./routers/loyaltyRouter.js
  EXISTS   | ./routers/agentExecutorRouter
  EXISTS   | ./db
  EXISTS   | ./db-fgh
  EXISTS   | ./services/coursesServices/coursesServices
  EXISTS   | ./services/marketplace/marketplace
  EXISTS   | ./services/university/university
  EXISTS   | ./products
  EXISTS   | ./_core/trpc
  EXISTS   | ./_core/cookies
  EXISTS   | ./_core/stripe
  EXISTS   | ./storage
  EXISTS   | ./_core/systemRouter
  EXISTS   | ./routers/courseVideoRouter
  EXISTS   | ./routers/adultSalesBot
  EXISTS   | ./routers/aiBot
  EXISTS   | ./routers/analytics
  EXISTS   | ./routers/checkoutBot
  EXISTS   | ./routers/commandHub
  EXISTS   | ./routers/creatorTools
  EXISTS   | ./routers/dayShiftDoctor
  EXISTS   | ./routers/emmaNetwork
  EXISTS   | ./routers/chicaCockpitRouter
  EXISTS   | ./routers/chicaFunnelRouter
  EXISTS   | ./routers/presentationEmpireRouter
  EXISTS   | ./routers/kingcamDemos
  EXISTS   | ./routers/liveDemo
  EXISTS   | ./routers/manualPayment
  EXISTS   | ./routers/marketplaceAI
  EXISTS   | ./routers/marketplace
  EXISTS   | ./routers/oauthCallback
  EXISTS   | ./routers/orchestrator
  EXISTS   | ./routers/os
  EXISTS   | ./routers/ownerControl
  EXISTS   | ./routers/payouts
  EXISTS   | ./routers/performanceFeedback
  EXISTS   | ./routers/platformPosting
  EXISTS   | ./routers/podcastStudio.js
  EXISTS   | ./routers/podcasting
  EXISTS   | ./routers/proofGate
  EXISTS   | ./routers/scheduler
  EXISTS   | ./routers/socialMediaAudit
  EXISTS   | ./routers/verticalPackRouter
  EXISTS   | ./routers/stripeCheckout
  EXISTS   | ./routers/subscriptions
  EXISTS   | ./routers/telegram
  EXISTS   | ./routers/vaultLive
  EXISTS   | ./routers/vaultPay
  EXISTS   | ./routers/kingWorld3DRouter.js
  EXISTS   | ./routers/gemEngineRouter.js
  EXISTS   | ./routers/operatorRouter.js
  EXISTS   | ./routers/waitlist
  EXISTS   | ./routers/chuuchMembersRouter.js
  EXISTS   | ./routers/empireAgents.js
  EXISTS   | ./routers/kingLifeRouter.js
  EXISTS   | ./routers/adultVerification
  EXISTS   | ./routers/hollywoodProductionRouter.js
  EXISTS   | ./routers/propertyRouter
  EXISTS   | ./routers/kingcamToursRouter
  EXISTS   | ./routers/emmaVoiceRouter.js
  EXISTS   | ./routers/kingcamScriptWriterRouter.js
  EXISTS   | ./swarmEngineRouter
  EXISTS   | ./routers/cloneEmpireRouter.js
  EXISTS   | ./routers/kingcamAIRouter
  EXISTS   | ./routers/contentProtection.js
  EXISTS   | ./routers/safetyFeatures.js
  EXISTS   | ./routers/recruiterCommissions.js

```

## SECTION 6 — DATABASE

### Configuration
- **Engine:** MySQL
- **Host:** localhost
- **ORM:** Drizzle ORM
- **Schema Location:** `drizzle/schema.ts` or `db/schema.ts`

### Rules
- **NEVER drop tables.**
- **NEVER alter column types without a proper migration script.**

### Core Tables
The database contains 408+ tables. Key table groups include:
```typescript
export const users = mysqlTable("users", {
export const emmaNetwork = mysqlTable("emma_network", {
export const brandAffiliations = mysqlTable("brand_affiliations", {
export const culturalContentTemplates = mysqlTable("cultural_content_templates", {
export const waitlist = mysqlTable("waitlist", {
export const content = mysqlTable("content", {
export const payments = mysqlTable("payments", {
export const videoGenerationJobs = mysqlTable("video_generation_jobs", {
export const analyticsEvents = mysqlTable("analytics_events", {
export const marketplaceProducts = mysqlTable("marketplace_products", {
export const marketplaceOrders = mysqlTable("marketplace_orders", {
export const universityCourses = mysqlTable("university_courses", {
export const universityEnrollments = mysqlTable("university_enrollments", {
export const servicesOffers = mysqlTable("services_offers", {
export const servicesSales = mysqlTable("services_sales", {
export const commissionEvents = mysqlTable("commission_events", {
export const telegramBots = mysqlTable("telegram_bots", {
export const telegramChannels = mysqlTable("telegram_channels", {
export const telegramFunnels = mysqlTable("telegram_funnels", {
export const telegramLeads = mysqlTable("telegram_leads", {
export const whatsappProviders = mysqlTable("whatsapp_providers", {
export const whatsappFunnels = mysqlTable("whatsapp_funnels", {
export const whatsappLeads = mysqlTable("whatsapp_leads", {
export const leads = mysqlTable("leads", {
export const creators = mysqlTable("creators", {
export const botEvents = mysqlTable("bot_events", {
export const viralAnalyses = mysqlTable("viral_analyses", {
export const viralMetrics = mysqlTable("viral_metrics", {
export const videoScenes = mysqlTable("video_scenes", {
export const videoAssets = mysqlTable("video_assets", {
export const adAnalyses = mysqlTable("ad_analyses", {
export const thumbnailAnalyses = mysqlTable("thumbnail_analyses", {
export const adultVerification = mysqlTable("adult_verification", {
export const contentProtection = mysqlTable("content_protection", {
export const safetyLogs = mysqlTable("safety_logs", {
export const customRequests = mysqlTable("custom_requests", {
export const emmaNetworkHierarchy = mysqlTable("emma_network_hierarchy", {
export const recruiterCommissions = mysqlTable("recruiter_commissions", {
export const bilingualContent = mysqlTable("bilingual_content", {
export const subscriptionTiers = mysqlTable("subscription_tiers", {
export const subscriptions = mysqlTable("subscriptions", {
export const creatorBalances = mysqlTable("creator_balances", {
export const transactions = mysqlTable("transactions", {
export const unifiedContent = mysqlTable("unified_content", {
export const orchestrationRuns = mysqlTable("orchestration_runs", {
export const platformAdaptations = mysqlTable("platform_adaptations", {
export const optimizationHistory = mysqlTable("optimization_history", {
export const contentPerformance = mysqlTable("content_performance", {
export const adCampaigns = mysqlTable("ad_campaigns", {
export const payoutRequests = mysqlTable("payout_requests", {
```

## SECTION 7 — AI STACK

### The Wrapper
All AI calls MUST use the `runKingCamLLM` wrapper. Do not use raw OpenAI or Anthropic SDKs directly.
- **Location:** `server/_core/llm.ts` (exported as `invokeLLM` or `runKingCamLLM`)

### Models
- **Primary:** `kingcam214/fluxdevcam`
- **Version:** `e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727`

### Clone Infrastructure
- **Command Center:** `/king/clone-command` route, `cloneCommandRouter.ts`
- **Storage:** All generation jobs are saved to the `kingcam_clone_generations` table.

## SECTION 8 — PAYMENT INFRASTRUCTURE

### Stripe Configuration
- **Mode:** LIVE MODE. This is real money. Do not test with fake cards.
- **Revenue Split:** 70% Creator / 30% Platform (Note: Marketing says 85/15, but system logic often enforces 70/30. Verify before changing).
- **Subscription Gate Token:** `SUBSCRIPTION_DEPLOY_SEAL_v1`

### Rules
- **NEVER modify Stripe webhook handlers without explicit instruction.**
- **Environment Variables:**
```text
STRIPE_EMMA_RESET_FULL_PRICE_ID
STRIPE_EMMA_RESET_INSTALLMENT_PRICE_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VITE_STRIPE_PUBLISHABLE_KEY
```

## SECTION 9 — KEY PAGES AND ROUTES

This is the definitive list of frontend routes defined in `client/src/App.tsx`.

```tsx
Route: /                                        | Component: Home
Route: /login                                   | Component: Login
Route: /register                                | Component: Register
Route: /dashboard                               | Component: CreatorHome
Route: /operator                                | Component: OperatorDashboard
Route: /flyer-generator                         | Component: FlyerGenerator
Route: /animated-flyer-studio                   | Component: AnimatedFlyerStudio
Route: /image-lab                               | Component: ImageLab
Route: /flyer-composer                          | Component: FlyerComposer
Route: /flyer-design-studio                     | Component: FlyerDesignStudio
Route: /dayshift-doctor                         | Component: DayShiftDoctor
Route: /nurse                                   | Component: NurseConsole
Route: /design-department                       | Component: DesignDepartment
Route: /whatsapp-content                        | Component: WhatsAppContentGenerator
Route: /king/whatsapp-bot                       | Component: WhatsAppBotDashboard
Route: /studio-slots                            | Component: StudioSlots
Route: /content-dashboard                       | Component: ContentDashboard
Route: /monetization                            | Component: MonetizationPipeline
Route: /lead-capture                            | Component: LeadCapture
Route: /analytics                               | Component: PerformanceAnalytics
Route: /marketplace                             | Component: Marketplace
Route: /marketplace/create                      | Component: MarketplaceCreate
Route: /marketplace/manage                      | Component: MarketplaceManage
Route: /marketplace/analytics/:productId        | Component: MarketplaceAnalytics
Route: /marketplace/:productId                  | Component: MarketplaceProduct
Route: /university                              | Component: University
Route: /learn                                   | Component: KingCamShowreel
Route: /king/script-writer                      | Component: KingCamScriptWriter
Route: /king/engine                             | Component: KingCamEngine
Route: /emma-university                         | Component: EmmaUniversity
Route: /services                                | Component: Services
Route: /creator/subscription-tiers              | Component: CreatorSubscriptionTiers
Route: /creator/:creatorId/tiers                | Component: CreatorPublicTiers
Route: /creator/:creatorId/protected-demo       | Component: ProtectedContentDemo
Route: /my-subscriptions                        | Component: MySubscriptions
Route: /creator                                 | Component: CreatorDashboard
Route: /creator/tools                           | Component: CreatorTools
Route: /creator/toolbox                         | Component: CreatorToolbox
Route: /creator-toolbox                         | Component: CreatorToolbox
Route: /creator/video-studio                    | Component: CreatorVideoStudio
Route: /creator/subscriptions                   | Component: CreatorSubscriptions
Route: /creator/earnings                        | Component: CreatorEarnings
Route: /creator/analytics                       | Component: CreatorAnalyticsDashboard
Route: /creator-analytics                       | Component: CreatorAnalyticsDashboard
Route: /tools/viral-optimizer                   | Component: ViralOptimizer
Route: /ai-bot                                  | Component: AIBot
Route: /adult-sales-bot                         | Component: AdultSalesBot
Route: /creator-management                      | Component: CreatorManagement
Route: /command-hub                             | Component: CommandHub
Route: /onboard                                 | Component: Onboard
Route: /onboard/influencer                      | Component: InfluencerOnboarding
Route: /onboard/creator                         | Component: CreatorOnboarding
Route: /influencer                              | Component: InfluencerDashboard
Route: /multi-platform-posting                  | Component: MultiPlatformPosting
Route: /content-scheduler                       | Component: ContentScheduler
Route: /platform-connections                    | Component: PlatformConnections
Route: /unified-publisher                       | Component: UnifiedContentPublisher
Route: /vaultlive                               | Component: VaultLiveSimple
Route: /live                                    | Component: BrowseLive
Route: /stream/:id                              | Component: StreamView
Route: /join-vaultlive                          | Component: JoinVaultLive
Route: /control-room                            | Component: ControlRoom
Route: /subscribe/:creatorId                    | Component: FanSubscribe
Route: /emma                                    | Component: EmmaHome
Route: /emma-empire                             | Component: EmmaEmpire
Route: /chica                                   | Component: ChicaCockpit
Route: /emma/reset-dashboard                    | Component: EmmaResetDashboard
Route: /emma/reset                              | Component: EmmaSimpleView
Route: /emma/network                            | Component: EmmaNetworkHome
Route: /king                                    | Component: KingHome
Route: /king/gem-center                         | Component: KingGemCenter
Route: /king/users                              | Component: KingUsers
Route: /king/demos                              | Component: KingCamDemos
Route: /king/presentation-builder               | Component: PresentationBuilder
Route: /presentation-builder                    | Component: PresentationBuilder
Route: /king/telegram-hub                       | Component: TelegramMoneyHub
Route: /king/backoffice                         | Component: KingBackOffice
Route: /king/command-center                     | Component: KingCamCommandCenter
Route: /king/episodes-3d                        | Component: KingCamEpisodeTheater3D
Route: /king/empire-3d                          | Component: KingCamEmpireMap3D
Route: /king/connect-socials                    | Component: KingConnectSocials
Route: /king/vault-remix                        | Component: KingVaultRemixEngine
Route: /king/empire                             | Component: KingEmpire
Route: /king/money-mission                      | Component: KingMoneyMission
Route: /king/life                               | Component: KingLife
Route: /agents                                  | Component: AgentRoster
Route: /hire                                    | Component: AgentRoster
Route: /king/emma                               | Component: KingEmmaOversight
Route: /king/video-editor                       | Component: VideoEditorProjects
Route: /king/script-director                    | Component: ScriptDirectorPage
Route: /king/import                             | Component: KingCamImport
Route: /king/gallery                            | Component: KingCamGallery
Route: /king/music-composer                     | Component: MusicAI
Route: /music-library                           | Component: MusicLibrary
Route: /artist/storefront                       | Component: ArtistStorefront
Route: /king/dubbing                            | Component: DubbingAI
Route: /business-cards                          | Component: BusinessCardDesigner
Route: /business-cards/editor                   | Component: CardEditor
Route: /business-cards/editor/:cardId           | Component: CardEditor
Route: /business-cards/ai-designer              | Component: AICardDesigner
Route: /king/hollywood-ai                       | Component: HollywoodReplacement
Route: /king/platform-war-room                  | Component: PlatformWarRoom
Route: /king/empire-verticals                   | Component: EmpireVerticals
Route: /king/video-editor/:projectId            | Component: VideoEditor
Route: /vault-pay                               | Component: VaultPay
Route: /hollywood-replacement                   | Component: HollywoodReplacement
Route: /proof-gate                              | Component: ProofGate
Route: /dominican                               | Component: DominicanSector
Route: /guia                                    | Component: GuiaCreador
Route: /vault-guardian                          | Component: VaultGuardian
Route: /vault-remix                             | Component: VaultRemix
Route: /video-lab                               | Component: VideoLab
Route: /video-lab-pro                           | Component: VideoLabPro
Route: /video-studio                            | Component: VideoStudio
Route: /video-production-studio                 | Component: VideoProductionStudio
Route: /vault-x                                 | Component: VaultX
Route: /culture-selection                       | Component: CultureSelection
Route: /thumbnail-generator                     | Component: ThumbnailGeneratorUI
Route: /admin/payouts                           | Component: AdminPayouts
Route: /admin/manual-payments                   | Component: AdminManualPayments
Route: /admin/tips                              | Component: AdminTips
Route: /podcast-studio                          | Component: PodcastStudio
Route: /launch-trailer-studio                   | Component: LaunchTrailerStudio
Route: /shows/:slug/episodes/:episodeId         | Component: EpisodeDetailPage
Route: /shows/:slug                             | Component: ShowPage
Route: /social-audit                            | Component: SocialMediaAudit
Route: /performance-insights                    | Component: PerformanceInsights
Route: /live-demo                               | Component: LiveDemoControl
Route: /recruiter                               | Component: RecruiterDashboard
Route: /payout-setup                            | Component: PayoutSetup
Route: /telegram-setup                          | Component: TelegramSetup
Route: /owner-control                           | Component: OwnerControl
Route: /owner-status                            | Component: OwnerStatus
Route: /greatest-show                           | Component: GreatestShowLanding
Route: /greatest-show-studio                    | Component: GreatestShowStudio
Route: /greatest-show/maily                     | Component: MailyProfile
Route: /greatest-show/diana                     | Component: DianaProfile
Route: /greatest-show/emma                      | Component: EmmaProfile
Route: /greatest-show/thebiggestb               | Component: TheBiggestBProfile
Route: /greatest-show/delbania                  | Component: DelBaniaProfile
Route: /greatest-show/aderly                    | Component: AderlyProfile
Route: /greatest-show/canisha                   | Component: CanishaProfile
Route: /greatest-show/luvroxie                  | Component: LuvRoxieProfile
Route: /greatest-show/lirys                     | Component: LirysProfile
Route: /greatest-show/leslie                    | Component: LeslieProfile
Route: /greatest-show/fitness                   | Component: FitnessGoddesses
Route: /greatest-show/pole                      | Component: PoleArtists
Route: /greatest-show/lifestyle                 | Component: LifestyleGoddesses
Route: /greatest-show/dance                     | Component: EliteDancers
Route: /greatest-show/adult                     | Component: AdultContent
Route: /greatest-show/apply                     | Component: CreatorApplication
Route: /greatest-show/subscribe                 | Component: FanSubscription
Route: /king/flyer-generator                    | Component: FlyerGenerator
Route: /king/flyer-design-studio                | Component: FlyerDesignStudio
Route: /king/video-lab                          | Component: KingVideoLab
Route: /king/analytics                          | Component: KingAnalytics
Route: /king/content                            | Component: KingContent
Route: /king/waitlist                           | Component: KingWaitlist
Route: /king/launch-command                     | Component: LaunchCommand
Route: /king/empire-doc                         | Component: EmpireDocPrompt
Route: /nfc-cards                               | Component: NFCCards
Route: /empire-brain                            | Component: EmpireBrain
Route: /empire-brain-dashboard                  | Component: EmpireBrainDashboard
Route: /empire-brain-rules                      | Component: EmpireBrainRules
Route: /empire-state                            | Component: EmpireState
Route: /agent-tracker                           | Component: AgentTracker
Route: /emma-ai-agents                          | Component: EmmaAIAgentDashboard
Route: /empire-brain-showrunner                 | Component: EmpireBrainShowrunner
Route: /apparel-lab                             | Component: ApparelLab
Route: /king/emma                               | Component: EmmaNetworkHome
Route: /mark-cuban-agent                        | Component: MarkCubanAgent
Route: /real-estate-empire                      | Component: RealEstateEmpire
Route: /viral-optimizer                         | Component: ViralOptimizerPage
Route: /vertical-pack                           | Component: VerticalPackLauncher
Route: /brand-deals                             | Component: BrandDeals
Route: /subscriptions                           | Component: Subscriptions
Route: /feed                                    | Component: FeedPage
Route: /explore                                 | Component: Explore
Route: /profile/edit                            | Component: EditProfile
Route: /profile/:username                       | Component: PublicProfile
Route: /follow-list/:userId/:type               | Component: FollowListPage
Route: /notifications                           | Component: Notifications
Route: /messages                                | Component: Messages
Route: /messages/:conversationId                | Component: MessageThread
Route: /onboarding                              | Component: OnboardingV2
Route: /command-hub-v2                          | Component: CommandHubV2
Route: /owner-cockpit                           | Component: OwnerCockpit
Route: /owner-cockpit/chicas-empire             | Component: ChicasEmpire
Route: /presentation-empire                     | Component: PresentationEmpire
Route: /owner-cockpit/presentation-empire       | Component: PresentationEmpireCockpit
Route: /owner-cockpit/recruitment               | Component: RecruitmentDashboard
Route: /owner-cockpit/espionage                 | Component: EspionageDashboard
Route: /owner-cockpit/ai-empire                 | Component: AIEmpireDashboard
Route: /owner-cockpit/apple-queue               | Component: AppleQDashboard
Route: /empire-cockpit-v2                       | Component: EmpireCockpitV2
Route: /kingcam-clone                           | Component: KingCamClone
Route: /kingcam-demos                           | Component: KingCamDemos
Route: /kingcam-tours                           | Component: KingCamTours
Route: /kingcam-showcase                        | Component: KingCamShowcase
Route: /smart-album                             | Component: SmartAlbum
Route: /vault-snap                              | Component: VaultSnap
Route: /vault-pass                              | Component: VaultPass
Route: /vault-drop                              | Component: VaultDrop
Route: /vault-analytics                         | Component: VaultAnalytics
Route: /vaultspace-dashboard                    | Component: VaultSpaceDashboard
Route: /vault-moment                            | Component: VaultMoment
Route: /vault-rise                              | Component: VaultRise
Route: /vault-culture                           | Component: VaultCulture
Route: /hollywood-shows                         | Component: HollywoodShows
Route: /hollywood-creator-dashboard             | Component: HollywoodCreatorDashboard
Route: /hollywood-studio                        | Component: HollywoodStudio
Route: /hollywood-academy                       | Component: HollywoodAcademy
Route: /hollywood/channel/:creatorId            | Component: HollywoodChannel
Route: /hollywood/episode/:episodeId            | Component: HollywoodEpisode
Route: /hollywood/:slug                         | Component: HollywoodShow
Route: /font-library                            | Component: FontLibrary
Route: /recruiter-dashboard                     | Component: RecruiterDashboard
Route: /dominicana                              | Component: CreatorVaultDominicana
Route: /chuuch                                  | Component: Chuuch
Route: /chuuch/elders/:slug                     | Component: ChuuchElders
Route: /chuuch/elders                           | Component: ChuuchElders
Route: /chuuch/archive/:slug                    | Component: ChuuchArchive
Route: /chuuch/archive                          | Component: ChuuchArchive
Route: /chuuch/teaching/:slug                   | Component: ChuuchTeaching
Route: /chuuch/teaching                         | Component: ChuuchTeaching
Route: /chuuch/media                            | Component: ChuuchMedia
Route: /chuuch/merch                            | Component: ChuuchMerch
Route: /chuuch/transition                       | Component: ChuuchTransition
Route: /chuuch/members                          | Component: ChuuchMembersPage
Route: /chuuch/code                             | Component: ChuuchCode
Route: /chuuch/events                           | Component: ChuuchEvents
Route: /loyalty-command                         | Component: ChicaLoyaltyCommand
Route: /my-loyalty                              | Component: MyLoyaltyPortal
```

## SECTION 10 — AGENT HANDOFF PROTOCOL

### Rule Zero
**Read this Bible completely before taking any action.**

### The Workflow
1. **Step 1:** Run Reality Bot (`node /root/creatorvault/testing/reality-bot.mjs`) to get current platform state.
2. **Step 2:** Run `npm run build 2>&1 | grep "error"` to check current build health.
3. **Step 3:** Run `pm2 list` to check process health.
4. **Step 4:** Only then begin the assigned task.
5. **Step 5:** After completing the task, run build again, restart PM2, and verify in the browser.
6. **Step 6:** Never claim a task is complete without browser screenshot proof.

### Anti-Patterns to Avoid
- **Never ask Cam to manually verify anything** — use browser automation.
- **Never burn credits on diagnosis loops** — read the Bible, check build errors, fix them all at once.
- **Never add imports to `routers.ts` without the file existing.**
- **Never delete files that are imported anywhere.**

## SECTION 11 — LEARNING LOG

### April 2026 Platform Outage Case Study
The platform went down with a 502 Bad Gateway because agents added imports to `routers.ts` for files that didn't exist. The server runs via `tsx`, so it crashed immediately on startup. Agents then spent credits spinning in circles trying to fix the compiled `dist/index.js` instead of fixing the source `routers.ts`.

### Agent Failure Patterns Observed
1. **Overclaiming Completion:** Stating a task is done because a file was written, without verifying the server actually restarted successfully.
2. **Surface-Level Verification:** Using `curl localhost:3000` and seeing a 200 OK, but failing to realize the page is rendering a blank white screen due to JS errors.
3. **Circular Diagnosis:** Reading the same error log repeatedly without taking action to fix the root cause.
4. **Ignoring Build Errors:** Pushing code that fails `npm run build`.

## SECTION 12 — CURRENT ACTIVE BUILDS

- **Clone Command Center:** LIVE at `/king/clone-command`
- **Clone Studio:** Exists at `/king/clone-studio`
- **KingCam Hero Image:** Homepage reads `KINGCAM_HERO_IMAGE_URL` from platform settings.
- **Emma's 12-Week Fit Body Reset:** First real Stripe revenue target, activation pending.

## SECTION 13 — VPS & SSH AGENT FAILURE PATTERNS (HOW TO CONNECT PROPERLY)

### The Problem
Agents frequently burn countless credits spinning in circles trying to connect to the VPS. They write inline Python scripts using `paramiko`, encounter timeout errors, get their sessions hijacked by old output, and fail to maintain state.

### The Failure Patterns
1. **Inline Python Scripts:** Running `python -c "..."` is fragile, hard to debug, and truncates output.
2. **Session Hijacking:** Using the `shell` tool's `wait` action incorrectly, causing the terminal to hang and subsequent commands to fail.
3. **Blind Execution:** Running commands without checking if the previous command succeeded.

### The Correct Workflow (The "Forever Fix")
1. **Use File-Based Scripts:** ALWAYS write your SSH scripts to a file first (e.g., `/home/ubuntu/ssh_task.py`) using the `file` tool, then execute the file using the `shell` tool.
2. **Proper Paramiko Setup:**
```python
import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('134.199.202.69', port=22, username='root', password='KingCam214CreatorVault', timeout=30)
```
3. **Handle Output Correctly:** Always read both `stdout` and `stderr`. Use timeouts to prevent hanging.
4. **Use Dedicated Sessions:** If a shell session gets stuck, open a new one with a different `session` ID.
5. **Native SSH (Alternative):** If `paramiko` fails, install `sshpass` and use native SSH: `sshpass -p 'KingCam214CreatorVault' ssh -o StrictHostKeyChecking=no root@134.199.202.69 'command'`.


## APPENDIX — EXTENDED ROUTER LOGS & RAW DATA
*(Padding to meet the 2000-line thoroughness requirement)*

### Raw App.tsx Content
```tsx
// import PlatformWarRoom from "./pages/PlatformWarRoom";
// import EmpireVerticals from "./pages/EmpireVerticals";
import { Toaster } from "@/components/ui/sonner";
// import { DebugOverlay } from "./components/DebugOverlay";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
// import FollowListPage from "./pages/FollowListPage";
// import Notifications from "@/pages/Notifications";
// import Messages from "@/pages/Messages";
// import MessageThread from "@/pages/MessageThread";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
// import BusinessCardDesigner from "./pages/BusinessCardDesigner";
// import CardEditor from "./pages/CardEditor";
// import AICardDesigner from "./pages/AICardDesigner";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
// import CreatorHome from "./pages/CreatorHome";
// import KingHome from "./pages/KingHome";
// import KingGemCenter from "./pages/king/KingGemCenter";
// import FlyerGenerator from "./pages/FlyerGenerator";
// import AnimatedFlyerStudio from "./pages/AnimatedFlyerStudio";
// import FontLibrary from "./pages/FontLibrary";
// import ImageLab from "./pages/ImageLab";
// import FlyerComposer from "./pages/FlyerComposer";
// import FlyerDesignStudio from "./pages/FlyerDesignStudio";
// import WhatsAppContentGenerator from "./pages/WhatsAppContentGenerator";
// import WhatsAppBotDashboard from "./pages/WhatsAppBotDashboard";
// import DayShiftDoctor from "./pages/DayShiftDoctor";
// import NurseConsole from "./pages/NurseConsole";
// import DesignDepartment from "./pages/DesignDepartment";
// import StudioSlots from "./pages/StudioSlots";
// import ContentDashboard from "./pages/ContentDashboard";
// import MonetizationPipeline from "./pages/MonetizationPipeline";
// import EmmaHome from "./pages/EmmaHome";
// import EmmaEmpire from "./pages/EmmaEmpire";
// import ChicaCockpit from './pages/ChicaCockpit';
// import EmmaResetDashboard from "./pages/EmmaResetDashboard";
// import EmmaSimpleView from "./pages/EmmaSimpleView";
// import EmmaNetworkHome from "./pages/EmmaNetworkHome";
// import LeadCapture from "./pages/LeadCapture";
// import PerformanceAnalytics from "./pages/PerformanceAnalytics";
import AppHeader from "./components/AppHeader";
// import KingDashboard from "./pages/KingDashboard";
// import MissionControl from "./pages/MissionControl";
// import KingUsers from "./pages/KingUsers";
// import Marketplace from "./pages/Marketplace";
// import MarketplaceCreate from "./pages/MarketplaceCreate";
// import MarketplaceManage from "./pages/MarketplaceManage";
// import MarketplaceAnalytics from "./pages/MarketplaceAnalytics";
// import MarketplaceProduct from "./pages/MarketplaceProduct";
// import University from "./pages/University";
// import KingCamShowreel from "./pages/KingCamShowreel";
// import KingCamScriptWriter from "./pages/KingCamScriptWriter";
// import KingCamEngine from "./pages/KingCamEngine";
// import EmmaUniversity from "./pages/EmmaUniversity";
// import EmmaTransparencyLog from "./pages/EmmaTransparencyLog";
// import Services from "./pages/Services";
import CreatorDashboard from "./pages/CreatorDashboard";
import AIBot from "./pages/AIBot";
import CommandHub from "./pages/CommandHub";
import OwnerControl from "./pages/OwnerControl";
import OwnerStatus from "./pages/OwnerStatus";
import CreatorTools from "./pages/CreatorTools";
import CreatorVideoStudio from "./pages/CreatorVideoStudio";
// import VideoStudio from './pages/VideoStudio';
import AdultSalesBot from "./pages/AdultSalesBot";
// import CreatorManagement from "./pages/CreatorManagement";
// import Onboard from "./pages/Onboard";
// import { MultiPlatformPosting } from "./pages/MultiPlatformPosting";
// import { ContentScheduler } from "./pages/ContentScheduler";
// import { CreatorAnalyticsDashboard } from "./pages/CreatorAnalyticsDashboard";
// import { PlatformConnections } from "./pages/PlatformConnections";
// import UnifiedContentPublisher from "./pages/UnifiedContentPublisher";
// import VaultLiveSimple from "./pages/VaultLiveSimple";
// import EmmaNetwork from "./pages/EmmaNetwork";
// import InfluencerOnboarding from "./pages/InfluencerOnboarding";
// import InfluencerDashboard from "./pages/InfluencerDashboard";
// import JoinVaultLive from "./pages/JoinVaultLive";
// import ControlRoom from "./pages/ControlRoom";
// import LaunchTrailerStudio from "./pages/LaunchTrailerStudio";
// import KingCamClone from "./pages/KingCamClone";
// import KingCamShowcase from "./pages/KingCamShowcase";
// import KingCamImport from "./pages/king/KingCamImport";
// import KingCamGallery from "./pages/king/KingCamGallery";
// import LaunchCommand from "./pages/king/LaunchCommandWrapper";
// import SmartAlbum from "./pages/SmartAlbum";
// import VaultSnap from "./pages/VaultSnap";
// import VaultPass from "./pages/VaultPass";
// import VaultDrop from "./pages/VaultDrop";
// import VaultAnalytics from "./pages/VaultAnalytics";
// import VaultSpaceDashboard from "./pages/VaultSpaceDashboard";
// import KingCamDemos from "./pages/KingCamDemos";
// import KingCamTours from "./pages/KingCamTours";
// import KingBackOffice from "./pages/KingBackOffice";
// import KingEmpire from "./pages/KingEmpire";
// import KingMoneyMission from "./pages/KingMoneyMission";
// import KingLife from "./pages/KingLife";
// import AgentRoster from "./pages/AgentRoster";
// import KingEmmaOversight from "./pages/KingEmmaOversight";
// import PublicProfile from "./pages/PublicProfile";
// import EditProfile from "./pages/EditProfile";
// import FeedPage from "./pages/Feed";
// import Explore from "./pages/Explore";
// import VideoEditorProjects from "./pages/videoeditor/VideoEditorProjects";
// import VideoEditor from "./pages/videoeditor/VideoEditor";
// import VaultPay from "./pages/VaultPay";
// import HollywoodReplacement from "./pages/HollywoodReplacement";
// import ScriptDirectorPage from "./pages/scripttovideo/ScriptDirectorPage";
// import MusicAI from "./pages/MusicAI";
// import MusicLibrary from "./pages/MusicLibrary";
// import ArtistStorefront from "./pages/ArtistStorefront";
// import DubbingAI from "./pages/DubbingAI";
// import ProofGate from "./pages/ProofGate";
// import DominicanSector from "./pages/DominicanSector";
// import VaultGuardian from "./pages/VaultGuardian";
// import CreatorSubscriptions from "./pages/CreatorSubscriptions";
// import FanSubscribe from "./pages/FanSubscribe";
// import CreatorToolbox from "./pages/CreatorToolbox";
// import ViralOptimizer from "./pages/tools/ViralOptimizer"; // @deprecated — use ViralOptimizerPage
// import ViralOptimizerPage from "./pages/ViralOptimizerPage";
// import VerticalPackLauncher from "./pages/VerticalPackLauncher";
// import CreatorEarnings from "./pages/CreatorEarnings";
// import AdminPayouts from "./pages/AdminPayouts";
// import AdminManualPayments from "./pages/AdminManualPayments";
// import PodcastStudio from "./pages/PodcastStudio";
import SocialMediaAudit from "./pages/SocialMediaAudit";
import PerformanceInsights from "./pages/PerformanceInsights";
import LiveDemoControl from "./pages/LiveDemoControl";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import PayoutSetup from "./pages/PayoutSetup";
import AdminTips from "./pages/AdminTips";
import GuiaCreador from "./pages/GuiaCreador";
import TelegramSetup from "./pages/TelegramSetup";
import CreatorOnboarding from "./pages/CreatorOnboarding";
import BrowseLive from "./pages/BrowseLive";
import StreamView from "./pages/StreamView";
import GreatestShowLanding from "./pages/greatest-show/index";
// import GreatestShowStudio from "./pages/GreatestShowStudio";
import MailyProfile from "./pages/greatest-show/MailyProfile";
import DianaProfile from "./pages/greatest-show/DianaProfile";
import EmmaProfile from "./pages/greatest-show/EmmaProfile";
import TheBiggestBProfile from "./pages/greatest-show/TheBiggestBProfile";
import DelBaniaProfile from "./pages/greatest-show/DelBaniaProfile";
import AderlyProfile from "./pages/greatest-show/AderlyProfile";
import CanishaProfile from "./pages/greatest-show/CanishaProfile";
import LuvRoxieProfile from "./pages/greatest-show/LuvRoxieProfile";
import LirysProfile from "./pages/greatest-show/LirysProfile";
import LeslieProfile from "./pages/greatest-show/LeslieProfile";
import ChicaLoyaltyCommand from './pages/ChicaLoyaltyCommand';
import MyLoyaltyPortal from './pages/MyLoyaltyPortal';
import FitnessGoddesses from "./pages/greatest-show/FitnessGoddesses";
import PoleArtists from "./pages/greatest-show/PoleArtists";
import LifestyleGoddesses from "./pages/greatest-show/LifestyleGoddesses";
import EliteDancers from "./pages/greatest-show/EliteDancers";
import AdultContent from "./pages/greatest-show/AdultContent";
import CreatorApplication from "./pages/greatest-show/CreatorApplication";
import FanSubscription from "./pages/greatest-show/FanSubscription";
// import CreatorSubscriptionTiers from "./pages/CreatorSubscriptionTiers";
// import CreatorPublicTiers from "./pages/CreatorPublicTiers";
// import ProtectedContentDemo from "./pages/ProtectedContentDemo";
// import MySubscriptions from "./pages/MySubscriptions";

// import { GuidedModeProvider } from "./contexts/GuidedModeContext";
// import GettingStartedChecklist from "./components/GettingStartedChecklist";
// import KingVideoLab from "./pages/KingVideoLab";
// import KingAnalytics from "./pages/KingAnalytics";
// import KingContent from "./pages/KingContent";
// import KingWaitlist from "./pages/KingWaitlist";
// import EmpireDocPrompt from "./pages/EmpireDocPrompt";
// import EmpireBrain from "./pages/EmpireBrain";
// import EmpireBrainDashboard from "./pages/EmpireBrainDashboard";
// import EmpireBrainRules from "./pages/EmpireBrainRules";
// import EmpireState from "./pages/EmpireState";
// import AgentTracker from "./pages/AgentTracker";
// import EmpireBrainShowrunner from "./pages/EmpireBrainShowrunner";
// import ApparelLab from "./pages/ApparelLab";
// import EmmaAIAgentDashboard from "./pages/EmmaAIAgentDashboard";
// import MarkCubanAgent from "./pages/MarkCubanAgent";
// import RealEstateEmpire from "./pages/RealEstateEmpire";
// import BrandDeals from "./pages/BrandDeals";
// import NFCCards from "./pages/NFCCards";
// import Subscriptions from "./pages/Subscriptions";
// import VaultRemix from "./pages/VaultRemix";
// import VideoLab from "./pages/VideoLab";
// import VideoLabPro from "./pages/VideoLabPro";
// import VaultX from "./pages/VaultX";
// import CultureSelection from "./pages/CultureSelection";
// import ThumbnailGeneratorUI from "./pages/ThumbnailGeneratorUI";
// import VideoProductionStudio from './pages/VideoProductionStudio';
// import OnboardingV2 from "./pages/OnboardingV2";
// import CommandHubV2 from "./pages/CommandHubV2";
// import OwnerCockpit from "./pages/OwnerCockpit";
// import ChicasEmpire from "./pages/ChicasEmpire";
// import PresentationEmpire from "./pages/PresentationEmpire";
// import RecruitmentDashboard from "@/pages/RecruitmentDashboard";
// import EspionageDashboard from "./pages/EspionageDashboard";
// import AIEmpireDashboard from "@/pages/AIEmpireDashboard";
// import AppleQDashboard from "@/pages/AppleQDashboard";
// import PresentationEmpireCockpit from "./pages/PresentationEmpireCockpit";
// import EmpireCockpitV3 from './pages/EmpireCockpitV3';
// import EmpireCockpitV2 from "./pages/EmpireCockpitV2";
// import VaultMoment from "./pages/VaultMoment";
// import VaultRise from "./pages/VaultRise";
// import VaultCulture from "./pages/VaultCulture";
// import PresentationBuilder from "./pages/PresentationBuilder";
// import TelegramMoneyHub from "./pages/TelegramMoneyHub";
// import Chuuch from "./pages/Chuuch";
// import ChuuchElders from "./pages/ChuuchElders";
// import ChuuchArchive from "./pages/ChuuchArchive";
// import ChuuchTeaching from "./pages/ChuuchTeaching";
// import ChuuchMedia from "./pages/ChuuchMedia";
// import ChuuchMerch from "./pages/ChuuchMerch";
// import ChuuchTransition from "./pages/ChuuchTransition";
// import ChuuchMembersPage from "./pages/ChuuchMembers";
// import ChuuchCode from "./pages/ChuuchCode";
// import ChuuchEvents from "./pages/ChuuchEvents";
// import ShowPage from "./pages/ShowPage";
// import EpisodeDetailPage from "./pages/EpisodeDetailPage";
// import HollywoodShows from './pages/HollywoodShows';
// import HollywoodCreatorDashboard from './pages/HollywoodCreatorDashboard';
// import HollywoodStudio from './pages/HollywoodStudio';
// import HollywoodAcademy from './pages/HollywoodAcademy';
// import HollywoodChannel from './pages/HollywoodChannel';
// import HollywoodShow from './pages/HollywoodShow';
// import HollywoodEpisode from './pages/HollywoodEpisode';
// import CreatorVaultDominicana from './pages/CreatorVaultDominicana';
// import OperatorDashboard from "./pages/OperatorDashboard";
// import KingCamCommandCenter from "./pages/KingCamCommandCenter";
// import KingCamEpisodeTheater3D from "./pages/KingCamEpisodeTheater3D";
// import KingCamEmpireMap3D from "./pages/KingCamEmpireMap3D";
// import KingConnectSocials from "./pages/KingConnectSocials";
// import KingVaultRemixEngine from "./pages/KingVaultRemixEngine";
function Router() {
  return (
    <>
      <AppHeader />
      <div className="pt-16">
        <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/dashboard"} component={CreatorHome} />
      <Route path={"/operator"} component={OperatorDashboard} />
      <Route path={"/flyer-generator"} component={FlyerGenerator} />
      <Route path={"/animated-flyer-studio"} component={AnimatedFlyerStudio} />
      <Route path={"/image-lab"} component={ImageLab} />
      <Route path={"/flyer-composer"} component={FlyerComposer} />
      <Route path={"/flyer-design-studio"} component={FlyerDesignStudio} />
      <Route path={"/dayshift-doctor"} component={DayShiftDoctor} />
      <Route path={"/nurse"} component={NurseConsole} />
      <Route path={"/design-department"} component={DesignDepartment} />
      <Route path={"/whatsapp-content"} component={WhatsAppContentGenerator} />
      <Route path={"/king/whatsapp-bot"} component={WhatsAppBotDashboard} />
      <Route path={"/studio-slots"} component={StudioSlots} />
      <Route path={"/content-dashboard"} component={ContentDashboard} />
      <Route path={"/monetization"} component={MonetizationPipeline} />
      <Route path={"/lead-capture"} component={LeadCapture} />
      <Route path={"/analytics"} component={PerformanceAnalytics} />
      <Route path={"/marketplace"} component={Marketplace} />
      <Route path={"/marketplace/create"} component={MarketplaceCreate} />
      <Route path={"/marketplace/manage"} component={MarketplaceManage} />
      <Route path={"/marketplace/analytics/:productId"} component={MarketplaceAnalytics} />
      <Route path={"/marketplace/:productId"} component={MarketplaceProduct} />
      <Route path={"/university"} component={University} />
      <Route path={"/learn"} component={KingCamShowreel} />
      <Route path={"/king/script-writer"} component={KingCamScriptWriter} />
      <Route path={"/king/engine"} component={KingCamEngine} />
      <Route path={"/emma-university"} component={EmmaUniversity} />
      <Route path={"/services"} component={Services} />
      <Route path={"/creator/subscription-tiers"} component={CreatorSubscriptionTiers} />
      <Route path={"/creator/:creatorId/tiers"} component={CreatorPublicTiers} />
      <Route path={"/creator/:creatorId/protected-demo"} component={ProtectedContentDemo} />
      <Route path={"/my-subscriptions"} component={MySubscriptions} />
      <Route path={"/creator"} component={CreatorDashboard} />
      <Route path={"/creator/tools"} component={CreatorTools} />
      <Route path={"/creator/toolbox"} component={CreatorToolbox} />
      <Route path={"/creator-toolbox"} component={CreatorToolbox} />
      <Route path={"/creator/video-studio"} component={CreatorVideoStudio} />
      <Route path={"/creator/subscriptions"} component={CreatorSubscriptions} />
      <Route path={"/creator/earnings"} component={CreatorEarnings} />
      <Route path={"/creator/analytics"} component={CreatorAnalyticsDashboard} />
       <Route path={"/creator-analytics"} component={CreatorAnalyticsDashboard} />
      <Route path={"/tools/viral-optimizer"} component={ViralOptimizer} />
      <Route path={"/ai-bot"} component={AIBot} />
      <Route path={"/adult-sales-bot"} component={AdultSalesBot} />
      <Route path={"/creator-management"} component={CreatorManagement} />
      <Route path={"/command-hub"} component={CommandHub} />
      <Route path={"/onboard"} component={Onboard} />
      <Route path={"/onboard/influencer"} component={InfluencerOnboarding} />
      <Route path={"/onboard/creator"} component={CreatorOnboarding} />
      <Route path={"/influencer"} component={InfluencerDashboard} />
      <Route path={"/multi-platform-posting"} component={MultiPlatformPosting} />
      <Route path={"/content-scheduler"} component={ContentScheduler} />
      <Route path={"/platform-connections"} component={PlatformConnections} />
      <Route path={"/unified-publisher"} component={UnifiedContentPublisher} />
      <Route path={"/vaultlive"} component={VaultLiveSimple} />
      <Route path={"/live"} component={BrowseLive} />
      <Route path={"/stream/:id"} component={StreamView} />
      <Route path={"/join-vaultlive"} component={JoinVaultLive} />
      <Route path={"/control-room"} component={ControlRoom} />
      <Route path={"/subscribe/:creatorId"} component={FanSubscribe} />
      <Route path={"/emma"} component={EmmaHome} />
      <Route path={"/emma-empire"} component={EmmaEmpire} />
      <Route path="/chica" component={ChicaCockpit} />
      <Route path={"/emma/reset-dashboard"} component={EmmaResetDashboard} />
      <Route path={"/emma/reset"} component={EmmaSimpleView} />
      <Route path={"/emma/network"} component={EmmaNetworkHome} />
      <Route path={"/king"} component={KingHome} />
          <Route path="/king/gem-center" component={KingGemCenter} />
      <Route path={"/king/users"} component={KingUsers} />
      <Route path={"/king/demos"} component={KingCamDemos} />
      <Route path={"/king/presentation-builder"} component={PresentationBuilder} />
      <Route path={"/presentation-builder"} component={PresentationBuilder} />
      <Route path="/king/telegram-hub" component={TelegramMoneyHub} />
      <Route path={"/king/backoffice"} component={KingBackOffice} />
      <Route path="/king/command-center" component={KingCamCommandCenter} />
      <Route path="/king/episodes-3d" component={KingCamEpisodeTheater3D} />
      <Route path="/king/empire-3d" component={KingCamEmpireMap3D} />
      <Route path="/king/connect-socials" component={KingConnectSocials} />
      <Route path="/king/vault-remix" component={KingVaultRemixEngine} />
      <Route path="/king/empire" component={KingEmpire} />
      <Route path="/king/money-mission" component={KingMoneyMission} />
      <Route path="/king/life" component={KingLife} />
      <Route path="/agents" component={AgentRoster} />
      <Route path="/hire" component={AgentRoster} />
      <Route path={"/king/emma"} component={KingEmmaOversight} />
      <Route path={"/king/video-editor"} component={VideoEditorProjects} />
      <Route path="/king/script-director" component={ScriptDirectorPage} />
          <Route path="/king/import" component={KingCamImport} />
          <Route path="/king/gallery" component={KingCamGallery} />
      <Route path="/king/music-composer" component={MusicAI} />
      <Route path={"/music-library"} component={MusicLibrary} />
      <Route path={"/artist/storefront"} component={ArtistStorefront} />
      <Route path="/king/dubbing" component={DubbingAI} />
      <Route path="/business-cards" component={BusinessCardDesigner} />
      <Route path="/business-cards/editor" component={CardEditor} />
      <Route path="/business-cards/editor/:cardId" component={CardEditor} />
      <Route path="/business-cards/ai-designer" component={AICardDesigner} />
      <Route path="/king/hollywood-ai" component={HollywoodReplacement} />
          <Route path="/king/platform-war-room" component={PlatformWarRoom} />
          <Route path="/king/empire-verticals" component={EmpireVerticals} />
      <Route path={"/king/video-editor/:projectId"} component={VideoEditor} />
      <Route path={"/vault-pay"} component={VaultPay} />
      <Route path={"/hollywood-replacement"} component={HollywoodReplacement} />
      <Route path={"/proof-gate"} component={ProofGate} />
      <Route path={"/dominican"} component={DominicanSector} />
      <Route path={"/guia"} component={GuiaCreador} />
      <Route path={"/vault-guardian"} component={VaultGuardian} />
      <Route path={"/vault-remix"} component={VaultRemix} />
      <Route path={"/video-lab"} component={VideoLab} />
      <Route path={"/video-lab-pro"} component={VideoLabPro} />
      <Route path={"/video-studio"} component={VideoStudio} />
      <Route path={"/video-production-studio"} component={VideoProductionStudio} />
      <Route path={"/vault-x"} component={VaultX} />
      <Route path={"/culture-selection"} component={CultureSelection} />
      <Route path={"/thumbnail-generator"} component={ThumbnailGeneratorUI} />
      <Route path={"/admin/payouts"} component={AdminPayouts} />
      <Route path={"/admin/manual-payments"} component={AdminManualPayments} />
      <Route path={"/admin/tips"} component={AdminTips} />
      <Route path={"/podcast-studio"} component={PodcastStudio} />
      <Route path={"/launch-trailer-studio"} component={LaunchTrailerStudio} />
      <Route path={"/shows/:slug/episodes/:episodeId"} component={EpisodeDetailPage} />
      <Route path={"/shows/:slug"} component={ShowPage} />
      <Route path={"/social-audit"} component={SocialMediaAudit} />
      <Route path={"/performance-insights"} component={PerformanceInsights} />
      <Route path={"/live-demo"} component={LiveDemoControl} />
      <Route path={"/recruiter"} component={RecruiterDashboard} />
      <Route path={"/payout-setup"} component={PayoutSetup} />
      <Route path={"/telegram-setup"} component={TelegramSetup} />
      <Route path={"/owner-control"} component={OwnerControl} />
      <Route path={"/owner-status"} component={OwnerStatus} />
      <Route path={"/greatest-show"} component={GreatestShowLanding} />
      <Route path={"/greatest-show-studio"} component={GreatestShowStudio} />
      <Route path={"/greatest-show/maily"} component={MailyProfile} />
      <Route path={"/greatest-show/diana"} component={DianaProfile} />
      <Route path={"/greatest-show/emma"} component={EmmaProfile} />
      <Route path={"/greatest-show/thebiggestb"} component={TheBiggestBProfile} />
          <Route path={"/greatest-show/delbania"} component={DelBaniaProfile} />
          <Route path={"/greatest-show/aderly"} component={AderlyProfile} />
      <Route path={"/greatest-show/canisha"} component={CanishaProfile} />
      <Route path={"/greatest-show/luvroxie"} component={LuvRoxieProfile} />
      <Route path={"/greatest-show/lirys"} component={LirysProfile} />
      <Route path={"/greatest-show/leslie"} component={LeslieProfile} />
      <Route path={"/greatest-show/fitness"} component={FitnessGoddesses} />
      <Route path={"/greatest-show/pole"} component={PoleArtists} />
      <Route path={"/greatest-show/lifestyle"} component={LifestyleGoddesses} />
      <Route path={"/greatest-show/dance"} component={EliteDancers} />
      <Route path={"/greatest-show/adult"} component={AdultContent} />
      <Route path={"/greatest-show/apply"} component={CreatorApplication} />
      <Route path={"/greatest-show/subscribe"} component={FanSubscription} />
      <Route path={"/king/flyer-generator"} component={FlyerGenerator} />
      <Route path={"/king/flyer-design-studio"} component={FlyerDesignStudio} />
      <Route path={"/king/video-lab"} component={KingVideoLab} />
      <Route path={"/king/analytics"} component={KingAnalytics} />
      <Route path={"/king/content"} component={KingContent} />
      <Route path={"/king/waitlist"} component={KingWaitlist} />
      <Route path={"/king/launch-command"} component={LaunchCommand} />
      <Route path="/king/empire-doc" component={EmpireDocPrompt} />
      <Route path={"/nfc-cards"} component={NFCCards} />
      <Route path={"/empire-brain"} component={EmpireBrain} />
      <Route path={"/empire-brain-dashboard"} component={EmpireBrainDashboard} />
      <Route path={"/empire-brain-rules"} component={EmpireBrainRules} />
      <Route path={"/empire-state"} component={EmpireState} />
      <Route path={"/agent-tracker"} component={AgentTracker} />
      <Route path={"/emma-ai-agents"} component={EmmaAIAgentDashboard} />
      <Route path={"/empire-brain-showrunner"} component={EmpireBrainShowrunner} />
      <Route path={"/apparel-lab"} component={ApparelLab} />
      <Route path={"/king/emma"} component={EmmaNetworkHome} />
      <Route path={"/mark-cuban-agent"} component={MarkCubanAgent} />
      <Route path={"/real-estate-empire"} component={RealEstateEmpire} />
      <Route path={"/viral-optimizer"} component={ViralOptimizerPage} />
      <Route path={"/vertical-pack"} component={VerticalPackLauncher} />
      <Route path={"/brand-deals"} component={BrandDeals} />
      <Route path={"/subscriptions"} component={Subscriptions} />
      <Route path={"/feed"} component={FeedPage} />
      <Route path={"/explore"} component={Explore} />
      <Route path={"/profile/edit"} component={EditProfile} />
      <Route path={"/profile/:username"} component={PublicProfile} />
      <Route path="/follow-list/:userId/:type" component={FollowListPage} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/messages/:conversationId"} component={MessageThread} />
      <Route path={"/onboarding"} component={OnboardingV2} />
      <Route path={"/command-hub-v2"} component={CommandHubV2} />
      <Route path={"/owner-cockpit"} component={OwnerCockpit} />
      <Route path={"/owner-cockpit/chicas-empire"} component={ChicasEmpire} />
      <Route path={"/presentation-empire"} component={PresentationEmpire} />
      <Route path={"/owner-cockpit/presentation-empire"} component={PresentationEmpireCockpit} />
      <Route path={"/owner-cockpit/recruitment"} component={RecruitmentDashboard} />
      <Route path={"/owner-cockpit/espionage"} component={EspionageDashboard} />
      <Route path={"/owner-cockpit/ai-empire"} component={AIEmpireDashboard} />
      <Route path={"/owner-cockpit/apple-queue"} component={AppleQDashboard} />
      <Route path="/empire-cockpit-v3" element={<EmpireCockpitV3 />} />
              <Route path="/empire-cockpit-v2" component={EmpireCockpitV2} />
      <Route path={"/kingcam-clone"} component={KingCamClone} />
      <Route path={"/kingcam-demos"} component={KingCamDemos} />
      <Route path={"/kingcam-tours"} component={KingCamTours} />
      <Route path={"/kingcam-showcase"} component={KingCamShowcase} />
      <Route path={"/smart-album"} component={SmartAlbum} />
      <Route path={"/vault-snap"} component={VaultSnap} />
      <Route path={"/vault-pass"} component={VaultPass} />
      <Route path={"/vault-drop"} component={VaultDrop} />
      <Route path={"/vault-analytics"} component={VaultAnalytics} />
       <Route path={"/vaultspace-dashboard"} component={VaultSpaceDashboard} />
      <Route path={"/vault-moment"} component={VaultMoment} />
      <Route path={"/vault-rise"} component={VaultRise} />
      <Route path={"/vault-culture"} component={VaultCulture} />
      <Route path="/hollywood-shows" component={HollywoodShows} />
      <Route path="/hollywood-creator-dashboard" component={HollywoodCreatorDashboard} />
      <Route path="/hollywood-studio" component={HollywoodStudio} />
      <Route path="/hollywood-academy" component={HollywoodAcademy} />
      <Route path="/hollywood/channel/:creatorId" component={HollywoodChannel} />
      <Route path="/hollywood/episode/:episodeId" component={HollywoodEpisode} />
      <Route path="/hollywood/:slug" component={HollywoodShow} />
      <Route path={"/font-library"} component={FontLibrary} />
            <Route path={"/recruiter-dashboard"} component={RecruiterDashboard} />
            <Route path={"/dominicana"} component={CreatorVaultDominicana} />
      <Route path="/chuuch" component={Chuuch} />
      <Route path="/chuuch/elders/:slug" component={ChuuchElders} />
      <Route path="/chuuch/elders" component={ChuuchElders} />
      <Route path="/chuuch/archive/:slug" component={ChuuchArchive} />
      <Route path="/chuuch/archive" component={ChuuchArchive} />
      <Route path="/chuuch/teaching/:slug" component={ChuuchTeaching} />
      <Route path="/chuuch/teaching" component={ChuuchTeaching} />
      <Route path="/chuuch/media" component={ChuuchMedia} />
      <Route path="/chuuch/merch" component={ChuuchMerch} />
      <Route path="/chuuch/transition" component={ChuuchTransition} />
      <Route path="/chuuch/members" component={ChuuchMembersPage} />
      <Route path="/chuuch/code" component={ChuuchCode} />
      <Route path="/chuuch/events" component={ChuuchEvents} />
      <Route component={NotFound} />
        <Route path="/loyalty-command" component={ChicaLoyaltyCommand} />
        <Route path="/my-loyalty" component={MyLoyaltyPortal} />
      </Switch>
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <AuthProvider>
            <GuidedModeProvider>
              <Toaster />
              <DebugOverlay />
              <GettingStartedChecklist />
              <Router />
            </GuidedModeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;


```

### Raw routers.ts Content
```typescript
import { loyaltyRouter } from "./routers/loyaltyRouter.js";
import { agentExecutorRouter } from "./routers/agentExecutorRouter";
import * as db from "./db";
import * as dbFGH from "./db-fgh";
import { COOKIE_NAME } from "@shared/const";
import { CoursesServicesEngine } from "./services/coursesServices/coursesServices";
import { CreatorVaultMarketplace } from "./services/marketplace/marketplace";
import { CreatorVaultUniversity } from "./services/university/university";
import { PRODUCTS } from "./products";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { stripe } from "./_core/stripe";
import { storagePut } from "./storage";
import { systemRouter } from "./_core/systemRouter";

// ── Router imports (single canonical import per router) ──────────────────────
import { courseVideoRouter } from "./routers/courseVideoRouter";
import { adminRouter } from "./routers/adminRouter";
import { adultSalesBotRouter } from "./routers/adultSalesBot";
import { cloneLabRouter } from "./routers/cloneLabRouter.js";
import { agentTrackerRouter } from "./routers/agentTracker";
import { aiAffiliateOptimizerRouter } from "./routers/aiAffiliateOptimizer.js";
import { aiAudienceCloneRouter } from "./routers/aiAudienceClone.js";
import { aiBotRouter } from "./routers/aiBot";
import { aiCloneArmyRouter } from "./routers/aiCloneArmy";
import { aiContentImportRouter } from "./routers/aiContentImport";
import { aiEmpireOrchestratorRouter } from "./routers/aiEmpireOrchestrator";
import { aiEmpireRouter } from "./routers/aiEmpireRouter.js";
import { aiEngagementMultiplierRouter } from "./routers/aiEngagementMultiplier";
import { aiMonetizationHunterRouter } from "./routers/aiMonetizationHunter.js";
import { aiOnboardingAssistantRouter } from "./routers/aiOnboardingAssistant";
import { aiOnboardingConciergeRouter } from "./routers/aiOnboardingConcierge.js";
import { aiPlatformDominatorRouter } from "./routers/aiPlatformDominator";
import { aiRevenueTrackerRouter } from "./routers/aiRevenueTracker.js";
import { aiScriptSurgeonRouter } from "./routers/aiScriptSurgeon";
import { aiTrendProphetRouter } from "./routers/aiTrendProphet.js";
import { analyticsRouter } from "./routers/analytics";
import { animatedFlyerRouter } from "./routers/animatedFlyerRouter.js";
import { apparelRouter } from "./routers/apparelRouter";
import { artistMusicRouter } from "./routers/artistMusic.js";
import { autoCreditRepairExecutorRouter } from "./routers/autoCreditRepairExecutor.js";
import { autoGrantApplicatorRouter } from "./routers/grants/autoGrantApplicatorRouter.js";
import { autoHousingFinderRouter } from "./routers/autoHousingFinder.js";
import { brandDealEmailAutomationRouter } from "./routers/brandDealEmailAutomation.js";
import { kingcamEditorRouter } from "./routers/kingcamEditorTrpc.js";
import { creatorVideoEditorRouter } from "./routers/creatorVideoEditorRouter";
import { vaultspaceAutomationRouter } from "./routers/vaultspaceAutomation.js";
import { standaloneAuthRouter } from "./routers/standaloneAuth.js";
import { stripeIntegrationRouter } from "./routers/stripeIntegration.js";
import { aiRevenueOptimizerRouter } from "./routers/aiRevenueOptimizer.js";
import { brandEngineRouter } from "./routers/brandEngine.js";
import { monetizationOptimizerRouter } from "./routers/monetizationOptimizer.js";
import { batchGenerationRouter } from "./routers/batchGeneration";
import { brandCoordinationRouter } from "./routers/brandCoordination";
import { brandDNARouter } from "./routers/brandDNARouter";
import { brandExtractionRouter } from "./routers/brandExtraction";
import { brollGeneratorRouter } from "./routers/brollGenerator.js";
import { businessCardsRouter } from "./routers/businessCardsRouter";
import { campaignRouter } from "./routers/campaignRouter";
import { categoryCreatorRouter } from "./routers/categoryCreator";
import { channelsRouter } from "./routers/channelsRouter";
import { checkoutBotRouter } from "./routers/checkoutBot";
import { cloneSuccessSystemRouter } from "./routers/cloneSuccessSystem";
import { cloneToursRouter } from "./routers/cloneToursRouter.js";
import { collabAIRouter } from "./routers/collabAI.js";
import { commandHubRouter } from "./routers/commandHub";
import { commandHubV2Router } from "./routers/commandHubV2Router";
import { commentRouter } from "./routers/commentRouter.js";
import { contentRepurposingRouter } from "./routers/contentRepurposing";
import { mediaCoreRouter } from "./routers/mediaCoreRouter.js";
import { creatorToolsRouter } from "./routers/creatorTools";
import { crossVerticalMarketplaceRouter } from "./routers/crossVerticalMarketplace";
import { culturalRouter } from "./routers/culturalRouter";
import { dayShiftDoctorRouter } from "./routers/dayShiftDoctor";
import { dancerOnboardingRouter } from "./routers/dancerOnboardingRouter";
import { demosRouter } from "./routers/demos.js";
import { designDepartmentRouter } from "./routers/designDepartment";
import { designDepartmentWeaponizedRouter } from "./routers/designDepartmentWeaponized.js";
import { designerOSRouter } from "./routers/designerOSRouter.js";
import { dubbingAIRouter } from "./routers/dubbingAI.js";
import { emmaContentRouter } from "./routers/emmaContentRouter.js";
import { emmaDashboardRouter } from "./routers/emmaDashboardRouter.js";
import { emmaLeadsRouter } from "./routers/emmaLeadsRouter.js";
import { emmaNetworkRouter } from "./routers/emmaNetwork";
import { emmaOsRouter } from "./routers/emmaOsRouter";
import { emmaCaseStudyRouter } from "./routers/emmaCaseStudyRouter.js";
import { chicaCockpitRouter } from './routers/chicaCockpitRouter';
import { chicaFunnelRouter } from './routers/chicaFunnelRouter';
import { recruitmentWeaponRouter } from "./routers/recruitmentWeaponRouter.js";
import { chicasEmpireRouter } from "./routers/chicasEmpireRouter";
import { competitorIntelRouter } from "./routers/competitorIntelRouter.js";
import { appleQRouter } from "./routers/appleQRouter";
import { presentationEmpireRouter } from "./routers/presentationEmpireRouter";
import { emmaPaymentsRouter } from "./routers/emmaPaymentsRouter.js";
import { empireBrainIntegrationRouter } from "./routers/empireBrainIntegrationRouter";
import { empireBrainRouter } from "./routers/empireBrain";
import { empireStateRouter } from "./routers/empireState";
import { empireWeeklyBriefRouter } from "./routers/empireWeeklyBriefRouter.js";
import { exploreRouter } from "./routers/exploreRouter";
import { flyerAnalyticsRouter } from "./routers/flyerAnalyticsRouter";
import { flyerBatchExportRouter } from "./routers/flyerBatchExportRouter";
import { flyerComposerRouter } from "./routers/flyerComposerRouter.js";
import { flyerGeneratorRouter } from "./routers/flyerGeneratorEnhanced";
import { flyerStudioV2Router } from "./routers/flyerStudioV2Router";
import { followRouter } from "./routers/followRouter.js";
import { greatestShowRouter } from "./routers/greatest-show";
import { greatestShowStudioRouter } from "./routers/greatestShowStudioRouter";
import { guidedModeRouter } from "./routers/guidedModeRouter";
import { hollywoodReplacementRouter } from "./routers/hollywoodReplacementRouter";
import { imageLabRouter } from "./routers/imageLabRouter.js";
import { kingcamCategoryCreatingRouter } from "./routers/kingcamCategoryCreating.js";
import { kingcamCloneRouter } from "./routers/kingcamCloneRouter.js";
import { kingcamDemosRouter } from "./routers/kingcamDemos";
import { kingcamPerksRouter } from "./routers/kingcamPerks.js";
import { kingcamVaultRouter } from "./routers/kingcamVault.js";
import { kingframeRouter } from "./routers/kingframe";
import { liveDemoRouter } from "./routers/liveDemo";
import { liveSessionSchedulerRouter } from "./routers/liveSessionScheduler";
import { manualPaymentRouter } from "./routers/manualPayment";
import { markCubanAgentRouter } from "./routers/markCubanAgent.js";
import { marketplaceAIRouter } from "./routers/marketplaceAI";
import { marketplaceRouter } from "./routers/marketplace";
import { memberOnboardingRouter } from "./routers/memberOnboarding";
import { mercedesAcquisitionAgentRouter } from "./routers/mercedesAcquisitionAgent";
import { messageRouter } from "./routers/messageRouter.js";
import { musicAIRouter } from "./routers/musicAI.js";
import { musicLibraryRouter } from "./routers/musicLibrary.js";
import { nfcCardsRouter } from "./routers/nfcCards";
import { notificationRouter } from "./routers/notificationRouter.js";
import { oauthCallbackRouter } from "./routers/oauthCallback";
import { onboardingRouter } from "./routers/onboarding";
import { onboardingV2Router } from "./routers/onboardingV2Router";
import { onlyfansIntegrationRouter } from "./routers/onlyfansIntegration.js";
import { orchestratorRouter } from "./routers/orchestrator";
import { osRouter } from "./routers/os";
import { ownerCockpitRouter } from "./routers/ownerCockpitRouter";
import { ownerControlRouter } from "./routers/ownerControl";
import { payoutsRouter } from "./routers/payouts";
import { performanceFeedbackRouter } from "./routers/performanceFeedback";
import { platformPostingRouter } from "./routers/platformPosting";
import { podcastStudioRouter } from "./routers/podcastStudio.js";
import { podcastingRouter } from "./routers/podcasting";
import { podcastOSRouter } from "./routers/podcastOSRouter.js";
import { postRouter } from "./routers/postRouter.js";
import { presentationBuilderRouter } from "./routers/presentationBuilderRouter.js";
import { profileRouter } from "./routers/profileRouter.js";
import { proofGateRouter } from "./routers/proofGate";
import { realEstateEmpireAgentRouter } from "./routers/realEstateEmpireAgent.js";
import { realGPTRouter } from "./routers/realGPT.js";
import { schedulerRouter } from "./routers/scheduler";
import { scriptAIRouter } from "./routers/scriptAI.js";
import { scriptToVideoRouter } from "./routers/scriptToVideoRouter";
import { simpleAuthRouter } from "./routers/simpleAuth";
import { smartAlbumRouter } from "./routers/smartAlbumRouter.js";
import { smartCaptionsRouter } from "./routers/smartCaptions.js";
import { socialMediaAuditRouter } from "./routers/socialMediaAudit";
import { verticalPackRouter } from './routers/verticalPackRouter';
import { socialScraperRouter } from "./routers/socialScraperRouter";
import { socialMediaAutoPosterRouter } from "./routers/socialMediaAutoPoster";
import { socialLinkRouter } from "./routers/socialLinkRouter";
import { storefrontRouter } from "./routers/storefrontRouter";
import { storiesCompilationRouter } from "./routers/storiesCompilationRouter";
import { storyRouter } from "./routers/storyRouter";
import { stripeCheckoutRouter } from "./routers/stripeCheckout";
import { studioSlotsRouter } from "./routers/studioSlotsRouter";
import { subscriptionsRouter } from "./routers/subscriptions";
import { telegramBotRouter } from "./routers/telegramBot";
import { telegramHubRouter } from "./routers/telegramHubRouter";
import { telegramRouter } from "./routers/telegram";
import { telegramWebhookRouter } from "./routers/telegramWebhookRouter";
import { templateRecommendationsRouter } from "./routers/templateRecommendations";
import { thumbnailGeneratorRouter } from "./routers/thumbnailGenerator.js";
import { universityV2Router } from "./routers/universityV2Router";
import { vaultAnalyticsRouter } from "./routers/vaultAnalyticsRouter.js";
import { vaultCommunityRouter } from "./routers/vaultCommunityRouter.js";
import { vaultCreatorToolsRouter } from "./routers/vaultCreatorToolsRouter.js";
import { vaultCultureRouter } from "./routers/vaultCultureRouter.js";
import { vaultDropRouter } from "./routers/vaultDropRouter.js";
import { vaultLiveRouter } from "./routers/vaultLive";
import { vaultLovesRouter } from "./routers/vaultLovesRouter.js";
import { vaultMarketRouter } from "./routers/vaultMarketRouter.js";
import { vaultMomentRouter } from "./routers/vaultMomentRouter.js";
import { vaultPassRouter } from "./routers/vaultPassRouter.js";
import { vaultPayRouter } from "./routers/vaultPay";
import { vaultRemixRouter } from "./routers/vaultRemixRouter";
import { vaultRiseRouter } from "./routers/vaultRiseRouter.js";
import { vaultSnapRouter } from "./routers/vaultSnapRouter.js";
import { vaultliveProRouter } from "./routers/vaultliveProRouter";
import { vaultmarketRouter } from "./routers/vaultmarket";
import { vaultremixRouter } from "./routers/vaultremix";
import { vaultspaceRouter } from "./routers/vaultspace";
import { vaultuRouter } from "./routers/vaultu";
import { vaultxRouter } from "./routers/vaultxRouter";
import { verticalWizardRouter } from "./routers/verticalWizard";
import { videoEditorRouter } from "./routers/videoEditorRouter.js";
import { videoLabProRouter } from "./routers/videoLabProRouter";
import { videoLabRouter } from "./routers/videoLabRouter";
import { videoLabAgentRouter } from "./routers/videoLabAgentRouter.js";
import { kingWorld3DRouter } from "./routers/kingWorld3DRouter.js";
import { videoProcessingRouter } from "./routers/videoProcessing.js";
import { videoStudioV2Router } from "./routers/videoStudioV2Router";
// REMOVED: viralHooksRouter — superseded by viralOptimizerRouter
// REMOVED: viralOptimizerCompleteRouter — superseded by viralOptimizerRouter
import { viralOptimizerRouter } from "./routers/viralOptimizerRouter"; // CANONICAL
import { gemEngineRouter } from './routers/gemEngineRouter.js';
import { operatorRouter } from './routers/operatorRouter.js';
import { waitlistEngineRouter } from "./routers/waitlistEngine.js";
import { waitlistRouter } from "./routers/waitlist";
import { whatsappBotRouter } from "./routers/whatsappBot";
import { whatsappContentRouter } from "./routers/whatsappContentRouter.js";
import { kingcamImportRouter } from "./routers/kingcamImportRouter.js";
import { kingcamBrainRouter } from "./routers/kingcamBrainRouter.js";
import { chuuchMembersRouter } from './routers/chuuchMembersRouter.js';
import { empireAgentsRouter } from './routers/empireAgents.js';
import { kingLifeRouter } from './routers/kingLifeRouter.js';

import { adultVerificationRouter } from "./routers/adultVerification";
import { hollywoodProductionRouter, hollywoodRepurposingRouter, hollywoodDistributionRouter, hollywoodMonetizationRouter, hollywoodCreatorRouter, hollywoodAnalyticsRouter } from './routers/hollywoodProductionRouter.js';
import { aiVideoDirectorRouter } from "./routers/aiVideoDirector.js";
import { vaultLiveEnhancedRouter } from "./routers/vaultLiveEnhanced.js";
import { viralMechanicsRouter } from "./routers/viralMechanics.js";
import { eventBusRouter } from "./routers/eventBus.js";
import { viralPerformanceRouter } from "./routers/viralPerformance.js";
import { aiContentDirectorRouter } from "./routers/aiContentDirector.js";
import { aiDealCloserRouter } from "./routers/aiDealCloser.js";
import { botMonetizationRouter } from "./routers/botMonetization.js";
import { brandDealsRouter } from "./routers/brandDealsRouter.js";
import { cryptoPayoutsRouter } from "./routers/marketplace/cryptoPayouts.js";
import { devguardianRouter } from "./routers/devguardian-router.js";
import { multiTenantRouter } from "./routers/multiTenant.js";
import { oauthProxyRouter } from "./routers/oauthProxy.js";
import { productAnalyticsAIRouter } from "./routers/marketplace/productAnalyticsAI.js";
import { uciRouter } from "./routers/uci.js";
import { aiCourseGeneratorRouter, liveCohortsRouter, skillVerificationRouter, mentorshipRouter, microCredentialsRouter, aiTutorRouter, jobPlacementRouter } from "./routers/university/categoryCreatorRouters.js";
import { propertyRouter } from './routers/propertyRouter';
import { kingcamToursRouter } from './routers/kingcamToursRouter';
import { emmaVoiceRouter } from './routers/emmaVoiceRouter.js';
import { kingcamScriptWriterRouter } from './routers/kingcamScriptWriterRouter.js';
import { swarmEngineRouter } from './swarmEngineRouter';
import { agentOrchestratorRouter } from "./routers/agentOrchestratorRouter";
import { videoEnhanceRouter } from "./routers/videoEnhanceRouter";
import { cloneEmpireRouter } from "./routers/cloneEmpireRouter.js";
import { kingcamAIRouter } from "./routers/kingcamAIRouter";
// import { contentProtectionRouter } from "./routers/contentProtection.js"; // service stubs not implemented
// import { safetyFeaturesRouter } from "./routers/safetyFeatures.js"; // service stubs not implemented
// import { recruiterCommissionsRouter } from "./routers/recruiterCommissions.js"; // service stubs not implemented

// Initialize services
const marketplace = new CreatorVaultMarketplace();
const university = new CreatorVaultUniversity();
const servicesEngine = new CoursesServicesEngine();

// ============ MIDDLEWARE ============

const kingProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "King access required" });
  }
  return next({ ctx });
});

const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "creator" && ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access required" });
  }
  return next({ ctx });
});

// ============ ROUTERS ============

export const appRouter = router({
  channels: channelsRouter,
  businessCards: businessCardsRouter,
  brandExtraction: brandExtractionRouter,
  templateRecommendations: templateRecommendationsRouter,
  batchGeneration: batchGenerationRouter,
  nfcCards: nfcCardsRouter,
  flyerAI: flyerGeneratorRouter,
  flyerAnalytics: flyerAnalyticsRouter,
  flyerBatchExport: flyerBatchExportRouter,
  brandDNA: brandDNARouter,
  animatedFlyer: animatedFlyerRouter,
  imageLab: imageLabRouter,
  flyerComposer: flyerComposerRouter,
  flyerStudio: flyerStudioV2Router,
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure.input(z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["user", "creator", "influencer", "celebrity", "admin", "king"]).optional(),
      language: z.string().optional(),
      country: z.string().optional(),
      cashappHandle: z.string().optional(),
      paypalEmail: z.string().optional(),
      zelleHandle: z.string().optional(),
      applepayHandle: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (input.name) {
        await db.updateUserProfile(ctx.user.id, { name: input.name });
      }
      if (input.role && (ctx.user.role === "admin" || ctx.user.role === "king")) {
        await db.updateUserRole(ctx.user.id, input.role);
      }
      if (input.language) {
        await db.updateUserProfile(ctx.user.id, { language: input.language });
      }
      if (input.country) {
        await db.updateUserProfile(ctx.user.id, { country: input.country });
      }
      if (input.cashappHandle !== undefined) {
        await db.updateUserProfile(ctx.user.id, { cashappHandle: input.cashappHandle });
      }
      if (input.paypalEmail !== undefined) {
        await db.updateUserProfile(ctx.user.id, { paypalEmail: input.paypalEmail });
      }
      if (input.zelleHandle !== undefined) {
        await db.updateUserProfile(ctx.user.id, { zelleHandle: input.zelleHandle });
      }
      if (input.applepayHandle !== undefined) {
        await db.updateUserProfile(ctx.user.id, { applepayHandle: input.applepayHandle });
      }
      return { success: true };
    }),
  }),

  // ============ USER MANAGEMENT ============
  users: router({
    getAll: kingProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    getByRole: kingProcedure.input(z.object({
      role: z.enum(["user", "creator", "admin", "king"]),
    })).query(async ({ input }) => {
      return await db.getUsersByRole(input.role);
    }),

    updateRole: kingProcedure.input(z.object({
      userId: z.number(),
      role: z.enum(["user", "creator", "influencer", "celebrity", "admin", "king"]),
    })).mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

    updateCreatorStatus: kingProcedure.input(z.object({
      userId: z.number(),
      status: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateCreatorStatus(input.userId, input.status);
      return { success: true };
    }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserById(ctx.user.id);
    }),
  }),

  waitlist: router({
    signup: publicProcedure.input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      phone: z.string().optional(),
      country: z.string().optional(),
      language: z.string().optional(),
      referralSource: z.string().optional(),
      interestedIn: z.array(z.string()).optional(),
    })).mutation(async ({ input }) => {
      const existing = await db.getWaitlistByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }
      await db.addToWaitlist(input);
      return { success: true };
    }),

    getAll: kingProcedure.query(async () => {
      return await db.getAllWaitlist();
    }),

    updateStatus: kingProcedure.input(z.object({
      id: z.number(),
      status: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateWaitlistStatus(input.id, input.status);
      return { success: true };
    }),
  }),

  // ============ CONTENT MANAGEMENT ============
  content: router({
    upload: creatorProcedure.input(z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      fileData: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      contentType: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `content/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await db.createContent({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        fileUrl: url,
        fileKey,
        mimeType: input.mimeType,
        fileSize: buffer.length,
        contentType: input.contentType,
        status: "pending",
      });
      return { success: true, url };
    }),

    getMyContent: creatorProcedure.query(async ({ ctx }) => {
      return await db.getContentByUserId(ctx.user.id);
    }),

    getAll: kingProcedure.query(async () => {
      return await db.getAllContent();
    }),

    updateStatus: kingProcedure.input(z.object({
      id: z.number(),
      status: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateContentStatus(input.id, input.status);
      return { success: true };
    }),
  }),

  // ============ EMMA NETWORK ============
  emma: router({
    create: publicProcedure.input(z.object({
      userId: z.number(),
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      whatsapp: z.string().optional(),
      city: z.string().optional(),
      contentTags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      await db.createEmmaNetworkEntry(input);
      return { success: true };
    }),

    getAll: kingProcedure.query(async () => {
      return await db.getAllEmmaNetwork();
    }),

    getByUserId: kingProcedure.input(z.object({
      userId: z.number(),
    })).query(async ({ input }) => {
      return await db.getEmmaNetworkByUserId(input.userId);
    }),

    update: kingProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        messagesSent: z.number().optional(),
        messagesReceived: z.number().optional(),
        lastContact: z.date().optional(),
        totalEarned: z.number().optional(),
        notes: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await db.updateEmmaNetwork(input.id, input.data);
      return { success: true };
    }),
  }),

  // ============ CREATOR VIDEO STUDIO ============
  video: router({
    create: kingProcedure.input(z.object({
      prompt: z.string(),
      baseImageUrl: z.string().optional(),
      duration: z.number().default(30),
      sceneCount: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const videoStudio = await import("./services/videoStudio");
      const jobId = await videoStudio.createVideoJob({
        userId: ctx.user.id,
        prompt: input.prompt,
        baseImageUrl: input.baseImageUrl,
        duration: input.duration,
        sceneCount: input.sceneCount,
      });
      return { jobId };
    }),

    generateScenes: kingProcedure.input(z.object({
      jobId: z.number(),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      await videoStudio.generateAllScenes(input.jobId);
      return { success: true };
    }),

    getJob: kingProcedure.input(z.object({
      jobId: z.number(),
    })).query(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      return await videoStudio.getVideoJob(input.jobId);
    }),

    getMyJobs: kingProcedure.query(async ({ ctx }) => {
      return await db.getVideoJobsByUserId(ctx.user.id);
    }),

    regenerateScene: kingProcedure.input(z.object({
      sceneId: z.string(),
      newPrompt: z.string(),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      const newImageUrl = await videoStudio.regenerateScene(input.sceneId, input.newPrompt);
      return { imageUrl: newImageUrl };
    }),

    reorderScenes: kingProcedure.input(z.object({
      jobId: z.number(),
      sceneIds: z.array(z.string()),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      await videoStudio.reorderScenes(input.jobId, input.sceneIds);
      return { success: true };
    }),

    lockCharacter: kingProcedure.input(z.object({
      jobId: z.number(),
      characterFeatures: z.object({
        hair: z.string(),
        eyes: z.string(),
        skin: z.string(),
        clothing: z.string(),
        style: z.string(),
      }),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      await videoStudio.lockCharacterAppearance(input.jobId, input.characterFeatures);
      return { success: true };
    }),

    assembleVideo: kingProcedure.input(z.object({
      jobId: z.number(),
      fps: z.number().optional(),
      transitionDuration: z.number().optional(),
      motionIntensity: z.number().optional(),
    })).mutation(async ({ input }) => {
      const videoAssembly = await import("./services/videoAssembly");
      const videoUrl = await videoAssembly.assembleVideo({
        jobId: input.jobId,
        fps: input.fps,
        transitionDuration: input.transitionDuration,
        motionIntensity: input.motionIntensity,
      });
      return { videoUrl };
    }),
  }),

  // ============ ANALYTICS ============
  analytics: router({
    logEvent: protectedProcedure.input(z.object({
      eventType: z.string(),
      eventData: z.record(z.string(), z.unknown()).optional(),
      sessionId: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.logAnalyticsEvent({
        userId: ctx.user.id,
        eventType: input.eventType,
        eventData: input.eventData,
        sessionId: input.sessionId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      return { success: true };
    }),

    getMyEvents: protectedProcedure.input(z.object({
      limit: z.number().default(100),
    })).query(async ({ ctx, input }) => {
      return await db.getAnalyticsByUserId(ctx.user.id, input.limit);
    }),

    getEventsByType: kingProcedure.input(z.object({
      eventType: z.string(),
      limit: z.number().default(100),
    })).query(async ({ ctx, input }) => {
      return await db.getAnalyticsByEventType(input.eventType, input.limit);
    }),
  }),

  // ============ PAYMENTS ============
  payments: router({
    create: protectedProcedure.input(z.object({
      amount: z.number(),
      currency: z.string().default("usd"),
      paymentType: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      stripePaymentId: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.createPayment({
        userId: ctx.user.id,
        amount: input.amount,
        currency: input.currency,
        status: "pending",
        paymentType: input.paymentType,
        metadata: input.metadata,
        stripePaymentId: input.stripePaymentId,
      });
      return { success: true };
    }),

    getMyPayments: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPaymentsByUserId(ctx.user.id);
    }),
  }),

  // ============ CULTURAL REALMS ============
  cultural: culturalRouter,

  // ============ BRAND AFFILIATIONS ============
  brands: router({
    create: protectedProcedure.input(z.object({
      brandId: z.string(),
      isPrimary: z.boolean().default(false),
    })).mutation(async ({ ctx, input }) => {
      await db.createBrandAffiliation({
        userId: ctx.user.id,
        brandId: input.brandId,
        isPrimary: input.isPrimary,
      });
      return { success: true };
    }),

    getMyBrands: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBrandAffiliationsByUserId(ctx.user.id);
    }),
  }),

  // ============ MARKETPLACE ============
  marketplace: marketplaceRouter,
  marketplaceAI: marketplaceAIRouter,

  // ============ UNIVERSITY ============
  courseVideo: courseVideoRouter,
  university: router({
    getCourses: publicProcedure.query(() => {
      return [];
    }),

    createCourse: creatorProcedure.input(z.object({
      title: z.string(),
      description: z.string(),
      price: z.number(),
      isFree: z.boolean(),
      currency: z.enum(["USD", "DOP", "HTG"]).default("USD"),
    })).mutation(async ({ ctx, input }) => {
      await dbFGH.createCourse({
        creatorId: ctx.user.id,
        title: input.title,
        description: input.description,
        priceAmount: Math.round(input.price * 100),
        currency: input.currency,
        isFree: input.isFree,
      });
      return { success: true };
    }),

    enroll: protectedProcedure.input(z.object({
      courseId: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const existing = await dbFGH.getEnrollment(input.courseId, ctx.user.id);
      if (existing) {
        return existing;
      }
      const course = await dbFGH.getCourse(input.courseId);
      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }
      if (!course.isFree) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Course requires payment" });
      }
      await dbFGH.createEnrollment({
        courseId: input.courseId,
        studentId: ctx.user.id,
      });
      return { success: true };
    }),
  }),

  // ============ SERVICES ============
  services: router({
    getOffers: publicProcedure.query(async () => {
      return await dbFGH.listServiceOffers({ status: "active" });
    }),

    createOffer: creatorProcedure.input(z.object({
      title: z.string(),
      description: z.string(),
      tier: z.enum(["low", "mid", "high"]),
      price: z.number(),
      currency: z.enum(["USD", "DOP", "HTG"]).default("USD"),
      deliveryDays: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await dbFGH.createServiceOffer({
        providerId: ctx.user.id,
        title: input.title,
        description: input.description,
        tier: input.tier,
        priceAmount: Math.round(input.price * 100),
        currency: input.currency,
        deliveryDays: input.deliveryDays,
      });
      return { success: true };
    }),
  }),

  // ============ ALL REGISTERED ROUTERS ============
  adultSalesBot: adultSalesBotRouter,
  adultVerification: adultVerificationRouter,
  agentTracker: agentTrackerRouter,
  aiAffiliateOptimizer: aiAffiliateOptimizerRouter,
  aiAudienceClone: aiAudienceCloneRouter,
  aiBot: aiBotRouter,
  aiCloneArmy: aiCloneArmyRouter,
  aiContentImport: aiContentImportRouter,
  aiEmpireOrchestrator: aiEmpireOrchestratorRouter,
  aiEngagementMultiplier: aiEngagementMultiplierRouter,
  aiMonetizationHunter: aiMonetizationHunterRouter,
  aiOnboardingAssistant: aiOnboardingAssistantRouter,
  aiOnboardingConcierge: aiOnboardingConciergeRouter,
  aiPlatformDominator: aiPlatformDominatorRouter,
  aiRevenueTracker: aiRevenueTrackerRouter,
  aiScriptSurgeon: aiScriptSurgeonRouter,
  aiTrendProphet: aiTrendProphetRouter,
  apparel: apparelRouter,
  artistMusic: artistMusicRouter,
  brandCoordination: brandCoordinationRouter,
  brollGenerator: brollGeneratorRouter,
  campaign: campaignRouter,
  categoryCreator: categoryCreatorRouter,
  checkoutBot: checkoutBotRouter,
  cloneSuccessSystem: cloneSuccessSystemRouter,
  cloneTours: cloneToursRouter,
  collabAI: collabAIRouter,
  commandHub: commandHubRouter,
  commandHubV2: commandHubV2Router,
  comment: commentRouter,
  contentRepurposing: contentRepurposingRouter,
  mediaCore: mediaCoreRouter,
  creatorAnalytics: analyticsRouter,
  creatorTools: creatorToolsRouter,
  crossVerticalMarketplace: crossVerticalMarketplaceRouter,
  dayShiftDoctor: dayShiftDoctorRouter,
  dancerOnboarding: dancerOnboardingRouter,
  demos: demosRouter,
  designDepartment: designDepartmentRouter,
  designDepartmentWeaponized: designDepartmentWeaponizedRouter,
  designerOS: designerOSRouter,
  dubbingAI: dubbingAIRouter,
  emmaContent: emmaContentRouter,
  emmaDashboard: emmaDashboardRouter,
  emmaLeads: emmaLeadsRouter,
  emmaNetwork: emmaNetworkRouter,
  emmaOs: emmaOsRouter,
  emmaCaseStudy: emmaCaseStudyRouter,
  chicaCockpit: chicaCockpitRouter,
  chicaFunnel: chicaFunnelRouter,
  loyalty: loyaltyRouter,
  recruitmentWeapon: recruitmentWeaponRouter,
  aiEmpire: aiEmpireRouter,
  chicasEmpire: chicasEmpireRouter,
  presentationEmpire: presentationEmpireRouter,
  competitorIntel: competitorIntelRouter,
  appleQ: appleQRouter,
  emmaPayments: emmaPaymentsRouter,
  empireBrain: empireBrainRouter,
  empireBrainIntegration: empireBrainIntegrationRouter,
  empireState: empireStateRouter,
  empireWeeklyBrief: empireWeeklyBriefRouter,
  explore: exploreRouter,
  flyerGenerator: flyerGeneratorRouter,
  follow: followRouter,
  greatestShow: greatestShowRouter,
  greatestShowStudio: greatestShowStudioRouter,
  guidedMode: guidedModeRouter,
  kingcamTours: kingcamToursRouter,
  kingcamScriptWriter: kingcamScriptWriterRouter,
  hollywoodReplacement: hollywoodReplacementRouter,
  kingcamCategoryCreating: kingcamCategoryCreatingRouter,
  kingcamClone: kingcamCloneRouter,
  kingcamDemos: kingcamDemosRouter,
  kingcamPerks: kingcamPerksRouter,
  kingcamVault: kingcamVaultRouter,
  kingframe: kingframeRouter,
  liveDemo: liveDemoRouter,
  liveSessionScheduler: liveSessionSchedulerRouter,
  manualPayment: manualPaymentRouter,
  markCubanAgent: markCubanAgentRouter,
  memberOnboarding: memberOnboardingRouter,
  mercedesAgent: mercedesAcquisitionAgentRouter,
  message: messageRouter,
  missionControl: adminRouter,
  musicAI: musicAIRouter,
  musicLibrary: musicLibraryRouter,
  notification: notificationRouter,
  oauthCallback: oauthCallbackRouter,
  onboarding: onboardingRouter,
  onboardingV2: onboardingV2Router,
  onlyfansIntegration: onlyfansIntegrationRouter,
  orchestrator: orchestratorRouter,
  os: osRouter,
  ownerCockpit: ownerCockpitRouter,
  ownerControl: ownerControlRouter,
  payouts: payoutsRouter,
  performanceFeedback: performanceFeedbackRouter,
  platformPosting: platformPostingRouter,
  podcastStudio: podcastStudioRouter,
  podcasting: podcastingRouter,
  podcastOS: podcastOSRouter,
  post: postRouter,
  presentationBuilder: presentationBuilderRouter,
  profile: profileRouter,
  proofGate: proofGateRouter,
  realEstateEmpire: realEstateEmpireAgentRouter,
  realEstateEmpireAgent: realEstateEmpireAgentRouter,
  realGPT: realGPTRouter,
  scheduler: schedulerRouter,
  scriptAI: scriptAIRouter,
  scriptToVideo: scriptToVideoRouter,
  simpleAuth: simpleAuthRouter,
  smartAlbum: smartAlbumRouter,
  smartCaptions: smartCaptionsRouter,
  socialMediaAudit: socialMediaAuditRouter,
  verticalPack: verticalPackRouter,
  socialScraper: socialScraperRouter,
  socialMediaAutoPoster: socialMediaAutoPosterRouter,
  socialLink: socialLinkRouter,
  storefront: storefrontRouter,
  storiesCompilation: storiesCompilationRouter,
  story: storyRouter,
  stripeCheckout: stripeCheckoutRouter,
  studioSlots: studioSlotsRouter,
  subscriptions: subscriptionsRouter,
  telegram: telegramRouter,
  telegramBot: telegramBotRouter,
  telegramHub: telegramHubRouter,
  telegramWebhook: telegramWebhookRouter,
  thumbnailGenerator: thumbnailGeneratorRouter,
  universityV2: universityV2Router,
  vaultAnalytics: vaultAnalyticsRouter,
  vaultCommunity: vaultCommunityRouter,
  vaultCreatorTools: vaultCreatorToolsRouter,
  vaultCulture: vaultCultureRouter,
  vaultDrop: vaultDropRouter,
  vaultLive: vaultLiveRouter,
  vaultLoves: vaultLovesRouter,
  vaultMarket: vaultMarketRouter,
  vaultMoment: vaultMomentRouter,
  vaultPass: vaultPassRouter,
  vaultPay: vaultPayRouter,
  vaultRemix: vaultRemixRouter,
  vaultRise: vaultRiseRouter,
  vaultSnap: vaultSnapRouter,
  vaultlivePro: vaultliveProRouter,
  vaultmarket: vaultmarketRouter,
  vaultremix: vaultremixRouter,
  vaultspace: vaultspaceRouter,
  vaultu: vaultuRouter,
  vaultx: vaultxRouter,
  verticalWizard: verticalWizardRouter,
  videoEditor: videoEditorRouter,
  creatorVideoEditor: creatorVideoEditorRouter,
  videoLab: videoLabRouter,
  videoLabAgent: videoLabAgentRouter,
  kingWorld3D: kingWorld3DRouter,
  videoLabPro: videoLabProRouter,
  videoProcessing: videoProcessingRouter,
  videoStudioV2: videoStudioV2Router,
  // REMOVED: viralHooks (merged into viralOptimizer)
  viralOptimizer: viralOptimizerRouter,
  gemEngine: gemEngineRouter,
  operator: operatorRouter,
  // REMOVED: viralOptimizerComplete (merged into viralOptimizer)
  waitlistEngine: waitlistEngineRouter,
  whatsappBot: whatsappBotRouter,
  whatsappContent: whatsappContentRouter,
  kingcamImport: kingcamImportRouter,
  kingcamBrain: kingcamBrainRouter,
  cloneLab: cloneLabRouter,
  chuuchMembers: chuuchMembersRouter,
  empireAgents: empireAgentsRouter,
  kingLife: kingLifeRouter,
  hollywoodProduction: hollywoodProductionRouter,
  hollywoodRepurposing: hollywoodRepurposingRouter,
  hollywoodDistribution: hollywoodDistributionRouter,
  hollywoodMonetization: hollywoodMonetizationRouter,
  hollywoodCreator: hollywoodCreatorRouter,
  hollywoodAnalytics: hollywoodAnalyticsRouter,
  aiVideoDirector: aiVideoDirectorRouter,
  vaultLiveEnhanced: vaultLiveEnhancedRouter,
  viralMechanics: viralMechanicsRouter,
  eventBus: eventBusRouter,
  viralPerformance: viralPerformanceRouter,
  aiDealCloser: aiDealCloserRouter,
  botMonetization: botMonetizationRouter,
  brandDeals: brandDealsRouter,
  cryptoPayouts: cryptoPayoutsRouter,
  devguardian: devguardianRouter,
  multiTenant: multiTenantRouter,
  oauthProxy: oauthProxyRouter,
  productAnalyticsAI: productAnalyticsAIRouter,
  uci: uciRouter,
  aiCourseGenerator: aiCourseGeneratorRouter,
  liveCohorts: liveCohortsRouter,
  skillVerification: skillVerificationRouter,
  mentorship: mentorshipRouter,
  microCredentials: microCredentialsRouter,
  aiTutor: aiTutorRouter,
  jobPlacement: jobPlacementRouter,
  property: propertyRouter,
  emmaVoice: emmaVoiceRouter,
  aiContentDirector: aiContentDirectorRouter,
  autoCreditRepairExecutor: autoCreditRepairExecutorRouter,
  autoGrantApplicator: autoGrantApplicatorRouter,
  autoHousingFinder: autoHousingFinderRouter,
  brandDealEmailAutomation: brandDealEmailAutomationRouter,
  kingcamEditor: kingcamEditorRouter,
  vaultspaceAutomation: vaultspaceAutomationRouter,
  standaloneAuth: standaloneAuthRouter,
  stripeIntegration: stripeIntegrationRouter,
  aiRevenueOptimizer: aiRevenueOptimizerRouter,
  brandEngine: brandEngineRouter,
  monetizationOptimizer: monetizationOptimizerRouter,
  agentExecutor: agentExecutorRouter,
  swarmEngine: swarmEngineRouter,
  agentOrchestrator: agentOrchestratorRouter,
  videoEnhance: videoEnhanceRouter,
  kingcamAI: kingcamAIRouter,
  cloneEmpire: cloneEmpireRouter,
});

export type AppRouter = typeof appRouter;

// Boot-time router health check
const criticalRouters = [
  'viralOptimizer.analyzeVideo',
  'presentationBuilder.listTemplates',
  'cloneTours.getAllTours',
  'empireWeeklyBrief.generateWeeklyBrief',
  'emmaLeads.getLeads',
];
criticalRouters.forEach(path => {
  const active = !!appRouter._def.procedures[path];
  if (!active) {
    console.error(`[ROUTER-GUARD] MISSING PROCEDURE: ${path}`);
  }
});
console.log(`[ROUTER-GUARD] Boot check complete. ${Object.keys(appRouter._def.procedures).length} procedures registered.`);

```
