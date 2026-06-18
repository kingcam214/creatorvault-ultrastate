import { loyaltyRouter } from "./routers/loyaltyRouter";
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
import { cloneLabRouter } from "./routers/cloneLabRouter";
import { cloneCommandRouter } from "./routers/cloneCommandRouter";
import { cloneTrainingLabRouter } from "./routers/cloneTrainingLabRouter";
import { godModeRouter } from "./routers/godModeRouter";
import { agentTrackerRouter } from "./routers/agentTracker";
import { aiAffiliateOptimizerRouter } from "./routers/aiAffiliateOptimizer";
import { aiAudienceCloneRouter } from "./routers/aiAudienceClone";
import { aiBotRouter } from "./routers/aiBot";
import { aiCloneArmyRouter } from "./routers/aiCloneArmy";
import { aiContentImportRouter } from "./routers/aiContentImport";
import { aiEmpireOrchestratorRouter } from "./routers/aiEmpireOrchestrator";
import { aiEmpireRouter } from "./routers/aiEmpireRouter";
import { aiEngagementMultiplierRouter } from "./routers/aiEngagementMultiplier";
import { aiMonetizationHunterRouter } from "./routers/aiMonetizationHunter";
import { aiOnboardingAssistantRouter } from "./routers/aiOnboardingAssistant";
import { aiOnboardingConciergeRouter } from "./routers/aiOnboardingConcierge";
import { aiPlatformDominatorRouter } from "./routers/aiPlatformDominator";
import { aiRevenueTrackerRouter } from "./routers/aiRevenueTracker";
import { aiScriptSurgeonRouter } from "./routers/aiScriptSurgeon";
import { aiTrendProphetRouter } from "./routers/aiTrendProphet";
import { analyticsRouter } from "./routers/analytics";
import { animatedFlyerRouter } from "./routers/animatedFlyerRouter";
import { apparelRouter } from "./routers/apparelRouter";
import { artistMusicRouter } from "./routers/artistMusic";
import { autoCreditRepairExecutorRouter } from "./routers/autoCreditRepairExecutor";
import { autoGrantApplicatorRouter } from "./routers/grants/autoGrantApplicatorRouter";
import { autoHousingFinderRouter } from "./routers/autoHousingFinder";
import { brandDealEmailAutomationRouter } from "./routers/brandDealEmailAutomation";
import { kingcamEditorRouter } from "./routers/kingcamEditorTrpc";
import { creatorVideoEditorRouter } from "./routers/creatorVideoEditorRouter";
import { vaultspaceAutomationRouter } from "./routers/vaultspaceAutomation";
import { standaloneAuthRouter } from "./routers/standaloneAuth";
import { stripeIntegrationRouter } from "./routers/stripeIntegration";
import { aiRevenueOptimizerRouter } from "./routers/aiRevenueOptimizer";
import { brandEngineRouter } from "./routers/brandEngine";
import { monetizationOptimizerRouter } from "./routers/monetizationOptimizer";
import { batchGenerationRouter } from "./routers/batchGeneration";
import { brandCoordinationRouter } from "./routers/brandCoordination";
import { brandDNARouter } from "./routers/brandDNARouter";
import { brandExtractionRouter } from "./routers/brandExtraction";
import { brollGeneratorRouter } from "./routers/brollGenerator";
import { businessCardsRouter } from "./routers/businessCardsRouter";
import { campaignRouter } from "./routers/campaignRouter";
import { categoryCreatorRouter } from "./routers/categoryCreator";
import { channelsRouter } from "./routers/channelsRouter";
import { checkoutBotRouter } from "./routers/checkoutBot";
import { cloneSuccessSystemRouter } from "./routers/cloneSuccessSystem";
import { cloneToursRouter } from "./routers/cloneToursRouter";
import { collabAIRouter } from "./routers/collabAI";
import { commandHubRouter } from "./routers/commandHub";
import { commandHubV2Router } from "./routers/commandHubV2Router";
import { commentRouter } from "./routers/commentRouter";
import { contentRepurposingRouter } from "./routers/contentRepurposing";
import { mediaCoreRouter } from "./routers/mediaCoreRouter";
import { mediaAssetsRouter } from "./routers/mediaAssets";
import { creatorToolsRouter } from "./routers/creatorTools";
import { crossVerticalMarketplaceRouter } from "./routers/crossVerticalMarketplace";
import { culturalRouter } from "./routers/culturalRouter";
import { dayShiftDoctorRouter } from "./routers/dayShiftDoctor";
import { dancerOnboardingRouter } from "./routers/dancerOnboardingRouter";
import { demosRouter } from "./routers/demos";
import { designDepartmentRouter } from "./routers/designDepartment";
import { designDepartmentWeaponizedRouter } from "./routers/designDepartmentWeaponized";
import { designerOSRouter } from "./routers/designerOSRouter";
import { dubbingAIRouter } from "./routers/dubbingAI";
import { emmaContentRouter } from "./routers/emmaContentRouter";
import { emmaDashboardRouter } from "./routers/emmaDashboardRouter";
import { emmaLeadsRouter } from "./routers/emmaLeadsRouter";
import { emmaNetworkRouter } from "./routers/emmaNetwork";
import { emmaOsRouter } from "./routers/emmaOsRouter";
import { emmaCaseStudyRouter } from "./routers/emmaCaseStudyRouter";
import { chicaCockpitRouter } from './routers/chicaCockpitRouter';
import { chicaFunnelRouter } from './routers/chicaFunnelRouter';
import { recruitmentWeaponRouter } from "./routers/recruitmentWeaponRouter";
import { creatorOutreachRouter } from "./routers/creatorOutreachRouter";
import { activationWarRoomRouter } from "./routers/activationWarRoomRouter";
import { conversionEngineRouter } from "./routers/conversionEngineRouter";
import { dailyRevenueEngineRouter } from "./routers/dailyRevenueEngineRouter";
import { recruiterOSRouter } from "./routers/recruiterOSRouter";
import { automatedDirectorRouter } from "./routers/automatedDirectorRouter";
import { revenueReportingRouter } from "./routers/revenueReportingRouter";
import { teaserEngineRouter } from "./routers/teaserEngineRouter";
import { aiChatterRouter } from "./routers/aiChatterRouter";
import { chicasEmpireRouter } from "./routers/chicasEmpireRouter";
import { competitorIntelRouter } from "./routers/competitorIntelRouter";
import { appleQRouter } from "./routers/appleQRouter";
import { presentationEmpireRouter } from "./routers/presentationEmpireRouter";
import { emmaPaymentsRouter } from "./routers/emmaPaymentsRouter";
import { empireBrainIntegrationRouter } from "./routers/empireBrainIntegrationRouter";
import { empireBrainRouter } from "./routers/empireBrain";
import { empireStateRouter } from "./routers/empireState";
import { empireWeeklyBriefRouter } from "./routers/empireWeeklyBriefRouter";
import { exploreRouter } from "./routers/exploreRouter";
import { flyerAnalyticsRouter } from "./routers/flyerAnalyticsRouter";
import { flyerBatchExportRouter } from "./routers/flyerBatchExportRouter";
import { flyerComposerRouter } from "./routers/flyerComposerRouter";
import { flyerGeneratorRouter } from "./routers/flyerGeneratorEnhanced";
import { flyerStudioV2Router } from "./routers/flyerStudioV2Router";
import { followRouter } from "./routers/followRouter";
import { greatestShowRouter } from "./routers/greatest-show";
import { greatestShowStudioRouter } from "./routers/greatestShowStudioRouter";
import { guidedModeRouter } from "./routers/guidedModeRouter";
import { hollywoodReplacementRouter } from "./routers/hollywoodReplacementRouter";
import { imageLabRouter } from "./routers/imageLabRouter";
import { kingcamCategoryCreatingRouter } from "./routers/kingcamCategoryCreating";
import { kingcamCloneRouter } from "./routers/kingcamCloneRouter";
import { kingcamDemosRouter } from "./routers/kingcamDemos";
import { kingcamPerksRouter } from "./routers/kingcamPerks";
import { kingcamVaultRouter } from "./routers/kingcamVault";
import { kingframeRouter } from "./routers/kingframe";
import { liveDemoRouter } from "./routers/liveDemo";
import { liveSessionSchedulerRouter } from "./routers/liveSessionScheduler";
import { manualPaymentRouter } from "./routers/manualPayment";
import { markCubanAgentRouter } from "./routers/markCubanAgent";
import { marketplaceAIRouter } from "./routers/marketplaceAI";
import { marketplaceRouter } from "./routers/marketplace";
import { memberOnboardingRouter } from "./routers/memberOnboarding";
import { mercedesAcquisitionAgentRouter } from "./routers/mercedesAcquisitionAgent";
import { messageRouter } from "./routers/messageRouter";
import { musicAIRouter } from "./routers/musicAI";
import { musicLibraryRouter } from "./routers/musicLibrary";
import { nfcCardsRouter } from "./routers/nfcCards";
import { notificationRouter } from "./routers/notificationRouter";
import { oauthCallbackRouter } from "./routers/oauthCallback";
import { onboardingRouter } from "./routers/onboarding";
import { onboardingV2Router } from "./routers/onboardingV2Router";
import { onlyfansIntegrationRouter } from "./routers/onlyfansIntegration";
import { orchestratorRouter } from "./routers/orchestrator";
import { osRouter } from "./routers/os";
import { ownerCockpitRouter } from "./routers/ownerCockpitRouter";
import { ownerControlRouter } from "./routers/ownerControl";
import { payoutsRouter } from "./routers/payouts";
import { performanceFeedbackRouter } from "./routers/performanceFeedback";
import { platformPostingRouter } from "./routers/platformPosting";
import { podcastStudioRouter } from "./routers/podcastStudio";
import { podcastingRouter } from "./routers/podcasting";
import { podcastOSRouter } from "./routers/podcastOSRouter";
import { postRouter } from "./routers/postRouter";
import { presentationBuilderRouter } from "./routers/presentationBuilderRouter";
import { profileRouter } from "./routers/profileRouter";
import { proofGateRouter } from "./routers/proofGate";
import { realEstateEmpireAgentRouter } from "./routers/realEstateEmpireAgent";
import { realGPTRouter } from "./routers/realGPT";
import { schedulerRouter } from "./routers/scheduler";
import { scriptAIRouter } from "./routers/scriptAI";
import { scriptToVideoRouter } from "./routers/scriptToVideoRouter";
import { simpleAuthRouter } from "./routers/simpleAuth";
import { smartAlbumRouter } from "./routers/smartAlbumRouter";
import { smartCaptionsRouter } from "./routers/smartCaptions";
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
import { telegramFunnelRouter } from "./routers/telegramFunnelRouter.js";
import { telegramHubRouter } from "./routers/telegramHubRouter";
import { telegramMoneyLoopRouter } from "./routers/telegramMoneyLoopRouter";
import { telegramCampaignRouter } from "./routers/telegramCampaignRouter";
import { telegramRouter } from "./routers/telegram";
import { telegramWebhookRouter } from "./routers/telegramWebhookRouter";
import { templateRecommendationsRouter } from "./routers/templateRecommendations";
import { thumbnailGeneratorRouter } from "./routers/thumbnailGenerator";
import { universityV2Router } from "./routers/universityV2Router";
import { vaultAnalyticsRouter } from "./routers/vaultAnalyticsRouter";
import { vaultCommunityRouter } from "./routers/vaultCommunityRouter";
import { vaultCreatorToolsRouter } from "./routers/vaultCreatorToolsRouter";
import { vaultCultureRouter } from "./routers/vaultCultureRouter";
import { vaultDropRouter } from "./routers/vaultDropRouter";
import { vaultLiveRouter } from "./routers/vaultLive";
import { vaultLovesRouter } from "./routers/vaultLovesRouter";
import { vaultMarketRouter } from "./routers/vaultMarketRouter";
import { vaultMomentRouter } from "./routers/vaultMomentRouter";
import { vaultPassRouter } from "./routers/vaultPassRouter";
import { vaultPayRouter } from "./routers/vaultPay";
import { vaultRemixRouter } from "./routers/vaultRemixRouter";
import { signatureTransformEngine } from "./routers/signatureTransformEngine";
import { vaultRiseRouter } from "./routers/vaultRiseRouter";
import { vaultSnapRouter } from "./routers/vaultSnapRouter";
import { vaultliveProRouter } from "./routers/vaultliveProRouter";
import { vaultmarketRouter } from "./routers/vaultmarket";
import { vaultremixRouter } from "./routers/vaultremix";
import { vaultspaceRouter } from "./routers/vaultspace";
import { vaultuRouter } from "./routers/vaultu";
import { vaultxRouter } from "./routers/vaultxRouter";
import { vaultxAcquisitionOperatorRouter } from "./routers/vaultxAcquisitionOperatorRouter";
import { verticalWizardRouter } from "./routers/verticalWizard";
import { videoEditorRouter } from "./routers/videoEditorRouter";
import { videoLabProRouter } from "./routers/videoLabProRouter";
import { videoLabRouter } from "./routers/videoLabRouter";
import { videoLabAgentRouter } from "./routers/videoLabAgentRouter";
import { kingWorld3DRouter } from "./routers/kingWorld3DRouter";
import { videoProcessingRouter } from "./routers/videoProcessing";
import { videoStudioV2Router } from "./routers/videoStudioV2Router";
// REMOVED: viralHooksRouter — superseded by viralOptimizerRouter
// REMOVED: viralOptimizerCompleteRouter — superseded by viralOptimizerRouter
import { viralOptimizerRouter } from "./routers/viralOptimizerRouter"; // CANONICAL
import { gemEngineRouter } from './routers/gemEngineRouter';
import { operatorRouter } from './routers/operatorRouter';
import { waitlistEngineRouter } from "./routers/waitlistEngine";
import { waitlistRouter } from "./routers/waitlist";
import { whatsappBotRouter } from "./routers/whatsappBot";
import { whatsappContentRouter } from "./routers/whatsappContentRouter";
import { kingcamImportRouter } from "./routers/kingcamImportRouter";
import { kingcamBrainRouter } from "./routers/kingcamBrainRouter";
import { chuuchMembersRouter } from './routers/chuuchMembersRouter';
import { empireAgentsRouter } from './routers/empireAgents';
import { kingLifeRouter } from './routers/kingLifeRouter';

import { adultVerificationRouter } from "./routers/adultVerification";
import { hollywoodProductionRouter, hollywoodRepurposingRouter, hollywoodDistributionRouter, hollywoodMonetizationRouter, hollywoodCreatorRouter, hollywoodAnalyticsRouter } from './routers/hollywoodProductionRouter';
import { aiVideoDirectorRouter } from "./routers/aiVideoDirector";
import { vaultLiveEnhancedRouter } from "./routers/vaultLiveEnhanced";
import { viralMechanicsRouter } from "./routers/viralMechanics";
import { eventBusRouter } from "./routers/eventBus";
import { viralPerformanceRouter } from "./routers/viralPerformance";
import { aiContentDirectorRouter } from "./routers/aiContentDirector";
import { aiDealCloserRouter } from "./routers/aiDealCloser";
import { botMonetizationRouter } from "./routers/botMonetization";
import { brandDealsRouter } from "./routers/brandDealsRouter";
import { cryptoPayoutsRouter } from "./routers/marketplace/cryptoPayouts";
import { devguardianRouter } from "./routers/devguardian-router";
import { multiTenantRouter } from "./routers/multiTenant";
import { oauthProxyRouter } from "./routers/oauthProxy";
import { productAnalyticsAIRouter } from "./routers/marketplace/productAnalyticsAI";
import { uciRouter } from "./routers/uci";
import { aiCourseGeneratorRouter, liveCohortsRouter, skillVerificationRouter, mentorshipRouter, microCredentialsRouter, aiTutorRouter, jobPlacementRouter } from "./routers/university/categoryCreatorRouters";
import { propertyRouter } from './routers/propertyRouter';
import { kingcamToursRouter } from './routers/kingcamToursRouter';
import { emmaVoiceRouter } from './routers/emmaVoiceRouter';
import { kingcamScriptWriterRouter } from './routers/kingcamScriptWriterRouter';
import { swarmEngineRouter } from './swarmEngineRouter';
import { agentOrchestratorRouter } from "./routers/agentOrchestratorRouter";
import { videoEnhanceRouter } from "./routers/videoEnhanceRouter";
import { cloneEmpireRouter } from "./routers/cloneEmpireRouter";
import { kingcamAIRouter } from "./routers/kingcamAIRouter";
import { agentTelemetryRouter } from "./routers/agentTelemetryRouter";
import { challengeAutomationRouter } from "./routers/challengeAutomationRouter";
import { polloRouter } from "./routers/polloRouter";
import { distributionRouter } from "./routers/distributionRouter";
// import { contentProtectionRouter } from "./routers/contentProtection"; // service stubs not implemented
// import { safetyFeaturesRouter } from "./routers/safetyFeatures"; // service stubs not implemented
// import { recruiterCommissionsRouter } from "./routers/recruiterCommissions"; // service stubs not implemented

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
    signup: publicProcedure.input(z.object({
      email: z.string().email(),
      username: z.string(),
      password: z.string().min(6),
      name: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Registration handled by session-based auth; return success for UI
      return { success: true, username: input.username };
    }),
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
    // @ts-ignore
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

    join: publicProcedure.input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      phone: z.string().optional(),
    })).mutation(async ({ input }) => {
      const existing = await db.getWaitlistByEmail(input.email);
      if (existing) return { success: true, position: 0 };
      await db.addToWaitlist(input);
      return { success: true, position: Math.floor(Math.random() * 500) + 100 };
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
  mediaAssets: mediaAssetsRouter,
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
  telegramFunnel: telegramFunnelRouter,
  telegramMoneyLoop: telegramMoneyLoopRouter,
  telegramCampaign: telegramCampaignRouter,
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
  signatureTransform: signatureTransformEngine,
  vaultRise: vaultRiseRouter,
  vaultSnap: vaultSnapRouter,
  vaultlivePro: vaultliveProRouter,
  vaultmarket: vaultmarketRouter,
  vaultremix: vaultremixRouter,
  vaultspace: vaultspaceRouter,
  vaultu: vaultuRouter,
  vaultx: vaultxRouter,
  vaultxAcquisition: vaultxAcquisitionOperatorRouter,
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
  cloneCommand: cloneCommandRouter,
  clone: cloneCommandRouter,
  cloneTrainingLab: cloneTrainingLabRouter,
  godMode: godModeRouter,
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
  agentTelemetry: agentTelemetryRouter,
  challengeAutomation: challengeAutomationRouter,
  activationWarRoom: activationWarRoomRouter,
  conversionEngine: conversionEngineRouter,
  dailyRevenueEngine: dailyRevenueEngineRouter,
  recruiterOS: recruiterOSRouter,
  // ── VaultX Revenue Operations Pipeline ──────────────────────────────────────
  creatorOutreach: creatorOutreachRouter,
  automatedDirector: automatedDirectorRouter,
  revenueReporting: revenueReportingRouter,
  teaserEngine: teaserEngineRouter,
  aiChatter: aiChatterRouter,
  pollo: polloRouter,
  distribution: distributionRouter,
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
    // @ts-ignore
  const active = !!appRouter._def.procedures[path];
  if (!active) {
    console.error(`[ROUTER-GUARD] MISSING PROCEDURE: ${path}`);
  }
});
console.log(`[ROUTER-GUARD] Boot check complete. ${Object.keys(appRouter._def.procedures).length} procedures registered.`);
