#!/usr/bin/env node

import { execSync } from 'child_process';

// Task allowlists
const ALLOWLISTS = {
  'private-channel-hold': [
    'client/src/pages/TelegramSetup.tsx',
    'server/routers/telegram.ts',
    'scripts/scope-guard.js'
  ],
  'recruiter-hold': [
    'client/src/pages/RecruiterDashboard.tsx',
    'scripts/scope-guard.js'
  ],
  'payout-setup-hold': [
    'client/src/pages/PayoutSetup.tsx',
    'scripts/scope-guard.js'
  ],
  'marketplace-hold': [
    'client/src/pages/Marketplace.tsx',
    'client/src/pages/MarketplaceProduct.tsx',
    'client/src/pages/MarketplaceManage.tsx',
    'client/src/pages/MarketplaceCreate.tsx',
    'client/src/pages/MarketplaceAnalytics.tsx',
    'scripts/scope-guard.js'
  ],
  'public-profile-hold': [
    'client/src/pages/PublicCreatorLanding.tsx',
    'scripts/scope-guard.js'
  ],
  'vaultx-distribution-hold': [
    'client/src/pages/VaultXDistribution.tsx',
    'scripts/scope-guard.js'
  ],
  'fan-access-hold': [
    'client/src/pages/FanSubscribe.tsx',
    'scripts/scope-guard.js'
  ],
  'vaultx-audience-hold': [
    'client/src/pages/ForYouFeed.tsx',
    'scripts/scope-guard.js'
  ],
  'admin-payouts-hold': [
    'client/src/pages/AdminPayouts.tsx',
    'scripts/scope-guard.js'
  ],
  'demos-proof': [
    'client/src/pages/Demos.tsx',
    'scripts/scope-guard.js'
  ],
  'vaultx-onboarding-hold': [
    'client/src/pages/VaultXOnboarding.tsx',
    'scripts/scope-guard.js'
  ],
  'vaultlive-hold': [
    'client/src/pages/JoinVaultLive.tsx',
    'client/src/pages/VaultLiveSimple.tsx',
    'scripts/scope-guard.js'
  ],
  'legacy-messages-hold': [
    'client/src/pages/Messages.tsx',
    'client/src/pages/MessageThread.tsx',
    'client/src/App.tsx',
    'scripts/scope-guard.js'
  ],
  homepage: [
    'client/src/pages/Home.tsx',
    'client/src/lib/homepageMediaRegistry.ts',
    'server/services/governedPolloService.ts',
    'server/routers/homepageMotionPilotRouter.ts',
    'server/routers.ts',
    'scripts/scope-guard.js',
    'client/src/index.css',
    'client/index.html',
    'package.json',
    'pnpm-lock.yaml'
  ],
  signup: [
    'client/src/pages/SignupPage.tsx',
    'scripts/scope-guard.js'
  ],
  login: [
    'client/src/pages/Login.tsx',
    'scripts/scope-guard.js'
  ],
  'public-marketplace-motion-gate': [
    'client/src/pages/Marketplace.tsx',
    'client/src/pages/PublicCreatorLanding.tsx',
    'server/routers/marketplace.ts',
    'scripts/scope-guard.js'
  ],
  'public-creator-landing': [
    'client/src/pages/PublicCreatorLanding.tsx',
    'client/src/pages/CreatorProfilePage.tsx',
    'server/routers/marketplace.ts',
    'server/routers/profileRouter.ts',
    'scripts/scope-guard.js'
  ],
  editor: [
    'server/services/bodyCinemaProviderRouter.ts',
    'server/services/complianceVault.ts',
    'server/services/renderGraph.ts',
    'server/services/paymentRouter.ts',
    'server/routers/bodyCinemaRouter.ts',
    'server/routers/complianceRouter.ts',
    'server/routers/renderGraphRouter.ts',
    'client/src/components/videoeditor/Timeline.tsx',
    'client/src/components/videoeditor/ControlsPanel.tsx',
    'client/src/components/videoeditor/MediaPanel.tsx',
    'client/src/components/videoeditor/VideoPreview.tsx',
    'client/src/pages/VaultXEditor.tsx',
    'client/src/pages/VaultXStudio.tsx',
    'server/routers/vaultxRouter.ts',
    'server/routers/videoStudioRouter.ts',
    'server/routers/creatorVideoEditorRouter.ts',
    'server/services/vaultxArtifactSpineService.ts',
    'server/services/adultVerification.ts',
    'server/services/adultSalesBot.ts',
    'server/_core/stripeWebhook.ts',
    'scripts/scope-guard.js'
  ],
  'vaultx-public-motion': [
    'client/src/pages/VaultX.tsx',
    'scripts/scope-guard.js'
  ],
  'vaultx-owner-supplied-visual-seed': [
    'client/src/pages/VaultX.tsx',
    'client/src/lib/homepageMediaRegistry.ts',
    'client/public/videos/owner-supplied/creator-spotlight-montage.mp4',
    'client/public/videos/owner-supplied/creator-spotlight-mirror.mp4',
    'client/public/videos/owner-supplied/reshula-tropical-motion.mp4',
    'scripts/scope-guard.js'
  ],
  'vault-remix-safety': [
    'client/src/pages/VaultRemix.tsx',
    'server/routers/vaultxRouter.ts',
    'scripts/scope-guard.js'
  ],
  vaultx: [
    'client/src/pages/VaultX.tsx',
    'client/src/lib/vaultxI18n.tsx',
    'client/src/pages/VaultXFanLibrary.tsx',
    'client/src/pages/VaultXEditor.tsx',
    'client/src/pages/VaultXStudio.tsx',
    'server/routers/vaultxRouter.ts',
    'server/routers/videoUploadRouter.ts',
    'server/_core/stripeWebhook.ts',
    'server/_core/index.ts',
    'server/routers/standaloneAuth.ts',
    'scripts/route-owner.js',
    'scripts/scope-guard.js',
    'client/src/index.css',
    'client/index.html',
    'public/images/platform/vaultx-hero-fallback.jpg',
    'public/videos/platform/vaultx-hero.mp4'
  ],
  'auth-runtime': [
    'client/src/_core/hooks/useAuth.ts',
    'scripts/scope-guard.js'
  ],
  'creator-identity': [
    'client/src/pages/EditProfile.tsx',
    'scripts/scope-guard.js'
  ],
  'creator-subscriptions-hold': [
    'client/src/pages/CreatorSubscriptions.tsx',
    'client/src/pages/CreatorSubscriptionTiers.tsx',
    'server/routers/subscriptions.ts',
    'scripts/scope-guard.js'
  ],
  navigation: [
    'client/src/App.tsx',
    'client/src/components/AppHeader.tsx'
  ],
  'route-truth-audit': [
    'client/src/App.tsx',
    'client/src/pages/OwnerStatus.tsx',
    'client/src/pages/NurseConsole.tsx',
    'client/src/pages/ProofGate.tsx',
    'client/src/pages/HollywoodCreatorDashboard.tsx',
    'client/src/pages/OnboardingV2.tsx',
    'client/src/pages/InfluencerOnboarding.tsx',
    'client/src/pages/CreatorOnboarding.tsx',
    'client/src/pages/NFCCards.tsx',
    'client/src/pages/Notifications.tsx',
    'client/src/pages/EmmaTransparencyLog.tsx',
    'client/src/pages/GodModeAI.tsx',
    'scripts/scope-guard.js'
  ],
  'greatest-show-consent': [
    'client/src/App.tsx',
    'scripts/scope-guard.js'
  ],
  'greatest-show-truth': [
    'client/src/pages/RecruiterOSCommandCenter.tsx',
    'server/routers/recruiterOSRouter.ts',
    'scripts/scope-guard.js'
  ],
  'maily-creator-world': [
    'client/src/App.tsx',
    'client/src/pages/MailyWorld.tsx',
    'client/public/videos/creator-pages/maily-outdoor-routine-source.mp4',
    'client/public/videos/creator-pages/maily-outdoor-routine-source-h264.mp4',
    'client/public/videos/creator-pages/maily-close-social-source.mp4',
    'client/public/videos/creator-pages/maily-event-unboxing-source.mp4',
    'client/public/videos/creator-pages/maily-studio-beauty-source.mp4',
    'client/public/videos/creator-pages/maily-studio-beauty-source-h264.mp4',
    'client/public/images/creator-pages/maily-outdoor-routine-poster.jpg',
    'client/public/images/creator-pages/maily-outdoor-routine-hero-poster.jpg',
    'scripts/scope-guard.js'
  ],
  'diana-creator-world': [
    'client/src/App.tsx',
    'client/src/pages/DianaWorld.tsx',
    'client/public/videos/creator-pages/diana-butterfly-balcony-source-h264.mp4',
    'client/public/images/creator-pages/diana-butterfly-balcony-poster.jpg',
    'scripts/scope-guard.js'
  ],
  'ady-creator-world': [
    'client/src/App.tsx',
    'client/src/pages/AdyWorld.tsx',
    'client/public/videos/creator-pages/ady-personal-style-source.mp4',
    'client/public/images/creator-pages/ady-personal-style-hero-poster.jpg',
    'client/public/videos/creator-pages/ady-braid-studio-source.mp4',
    'client/public/videos/creator-pages/ady-braid-studio-source-h264.mp4',
    'client/public/videos/creator-pages/ady-braid-craft-source.mp4',
    'client/public/videos/creator-pages/ady-braid-craft-source-h264.mp4',
    'scripts/scope-guard.js'
  ],
  'ady-ignition-source-expansion': [
    'client/src/pages/AdyWorld.tsx',
    'client/public/videos/creator-pages/ady-makeup-style-source.mp4',
    'client/public/videos/creator-pages/ady-makeup-style-source-h264.mp4',
    'client/public/videos/creator-pages/ady-microlocs-source.mp4',
    'client/public/videos/creator-pages/ady-microlocs-source-h264.mp4',
    'scripts/scope-guard.js'
  ],
  'kingcam-clone-guide': [
    'client/src/App.tsx',
    'client/src/pages/KingCamGuide.tsx',
    'scripts/scope-guard.js'
  ],
  'kingcam-governed-pollo-motion': [
    'client/src/pages/KingCamGuide.tsx',
    'server/routers/governedPolloRouter.ts',
    'server/routers.ts',
    'scripts/scope-guard.js'
  ],
  'kingcam-clone-operating-system': [
    'client/src/App.tsx',
    'client/src/pages/KingCamClone.tsx',
    'client/src/components/KingCamPerformanceCapture.tsx',
    'client/src/pages/KingCamGuide.tsx',
    'client/src/pages/KingCamProfile.tsx',
    'client/src/pages/KingCamVault.tsx',
    'client/public/images/kingcam-profile/kingcam-crown-lounge-reference.png',
    'server/routers.ts',
    'server/routers/kingcamCloneOperatingSystemRouter.ts',
    'server/routers/mediaAssets.ts',
    'server/routers/videoUploadRouter.ts',
    'server/services/kingcamCloneOperatingSystemService.ts',
    'server/services/audioIntelligenceService.ts',
    'server/services/governedPolloService.ts',
    'server/routers/governedPolloRouter.ts',
    'server/services/digitalOceanWanProofWorkerProvisioner.ts',
    'server/services/wanAnimateProofWorkerConnectionService.ts',
    'server/services/wanAnimate2ProofService.ts',
    'workers/wan-proof/Dockerfile',
    'workers/wan-proof/requirements.txt',
    'workers/wan-proof/app/main.py',
    'workers/wan-proof/app/patch_wan_bf16.py',
    'workers/wan-proof/app/wan_animate_2_proof.yaml',
    'LEARNING_LOG.md',
    'scripts/scope-guard.js'
  ],
  'kingcam-in-platform-profile': [
    'client/src/App.tsx',
    'client/src/pages/KingCamProfile.tsx',
    'client/public/images/kingcam-profile/kingcam-crown-lounge.webp',
    'client/public/images/kingcam-profile/kingcam-crown-hall.webp',
    'client/public/videos/kingcam-profile/kingcam-red-hat-reel.mp4',
    'scripts/scope-guard.js'
  ],
  'reshula-in-platform-profile': [
    'client/src/App.tsx',
    'client/src/pages/ReshulaProfile.tsx',
    'scripts/scope-guard.js'
  ],
  'reshula-no-male-correction': [
    'client/src/pages/ReshulaWorld.tsx',
    'client/src/pages/FoundingCreatorPages.tsx',
    'client/public/videos/creator-pages/reshula-market-comedy.mp4',
    'client/public/videos/creator-pages/reshula-mall-dance.mp4',
    'client/public/videos/creator-pages/reshula-gym-joy.mp4',
    'scripts/scope-guard.js'
  ],
  'reshula-ignition-source-expansion': [
    'client/src/pages/ReshulaWorld.tsx',
    'client/public/videos/creator-pages/reshula-solo-lifestyle-source.mp4',
    'client/public/videos/creator-pages/reshula-solo-lifestyle-source-h264.mp4',
    'scripts/scope-guard.js'
  ],
  'leslie-ignition-world': [
    'client/src/App.tsx',
    'client/src/pages/LeslieWorld.tsx',
    'client/public/videos/creator-pages/leslie-social-presence-source.mp4',
    'client/public/videos/creator-pages/leslie-social-presence-source-h264.mp4',
    'client/public/videos/creator-pages/leslie-roses-lifestyle-source.mp4',
    'client/public/videos/creator-pages/leslie-roses-lifestyle-source-h264.mp4',
    'client/public/videos/creator-pages/leslie-studio-presence-source.mp4',
    'client/public/videos/creator-pages/leslie-studio-presence-source-h264.mp4',
    'client/public/images/creator-pages/leslie-social-presence-poster.jpg',
    'scripts/scope-guard.js'
  ],
  'reshula-creator-world': [
    'client/src/App.tsx',
    'client/src/pages/ReshulaWorld.tsx',
    'client/public/videos/owner-supplied/reshula-tropical-motion-h264.mp4',
    'scripts/scope-guard.js'
  ],
  'biggest-b-body-cinema-world': [
    'client/src/App.tsx',
    'client/src/pages/BiggestBWorld.tsx',
    'client/public/videos/creator-pages/biggest-b-abs-mirror-source.mp4',
    'client/public/videos/creator-pages/biggest-b-dumbbell-core-source.mp4',
    'scripts/scope-guard.js'
  ],
  'consented-creator-pages': [
    'client/src/App.tsx',
    'client/src/pages/FoundingCreatorPages.tsx',
    'client/public/images/creator-pages/reshula-public-source.jpg',
    'client/public/images/creator-pages/maily-public-source.jpg',
    'client/public/images/creator-pages/biggest-b-public-source.jpg',
    'client/public/images/creator-pages/diana-public-source.jpg',
    'client/public/images/creator-pages/aderly-public-source.jpg',
    'client/public/images/creator-pages/luv-roxie-public-source.jpg',
    'client/public/images/creator-pages/leslie-public-source.jpg',
    'client/public/videos/owner-supplied/reshula-tropical-motion.mp4',
    'client/public/videos/creator-pages/reshula-market-comedy.mp4',
    'client/public/videos/creator-pages/reshula-mall-dance.mp4',
    'client/public/videos/creator-pages/reshula-gym-joy.mp4',
    'client/public/videos/creator-pages/reshula-mirror-lifestyle.mp4',
    'client/public/videos/creator-pages/maily-beauty-vlog.mp4',
    'client/public/videos/creator-pages/maily-street-energy.mp4',
    'client/public/videos/creator-pages/maily-coastal-motion.mp4',
    'client/public/videos/creator-pages/biggest-b-park-energy.mp4',
    'client/public/videos/creator-pages/biggest-b-morning-life.mp4',
    'client/public/videos/creator-pages/biggest-b-dance-expression.mp4',
    'client/public/videos/creator-pages/diana-porch-dance.mp4',
    'client/public/videos/creator-pages/diana-city-style.mp4',
    'client/public/videos/creator-pages/aderly-follow-me.mp4',
    'client/public/videos/creator-pages/leslie-travel-escape.mp4',
    'client/public/videos/creator-pages/leslie-nature-flow.mp4',
    'client/public/videos/creator-pages/leslie-island-motion.mp4',
    'client/public/videos/creator-pages/delbania-salon-life.mp4',
    'client/public/videos/creator-pages/canisha-live-stage.mp4',
    'client/public/videos/creator-pages/canisha-studio-teaser.mp4',
    'client/public/videos/creator-pages/canisha-celebration-motion.mp4',
    'scripts/scope-guard.js'
  ],
  distribution: [
    'client/src/pages/WhatsAppContentGenerator.tsx',
    'client/src/pages/TelegramMoneyHub.tsx',
    'scripts/scope-guard.js'
  ],
  analytics: [
    'client/src/pages/CreatorAnalyticsDashboard.tsx',
    'server/routers/analytics.ts',
    'server/services/creatorAnalytics.ts',
    'scripts/scope-guard.js'
  ],
  dashboard: [
    'client/src/pages/Dashboard.tsx',
    'scripts/scope-guard.js'
  ],
  'dubbing-ai-hold': [
    'client/src/pages/DubbingAI.tsx',
    'client/src/pages/KingContent.tsx',
    'server/routers/dubbingAI.ts',
    'scripts/scope-guard.js'
  ],
  'clone-engine-hold': [
    'server/routers/cloneEngineRouter.ts',
    'scripts/scope-guard.js'
  ],
  'apparel-hold': [
    'client/src/App.tsx',
    'server/routers/apparelRouter.ts',
    'server/routers/kingcamAIRouter.ts',
    'scripts/scope-guard.js'
  ],
  'thumbnail-hold': [
    'client/src/pages/CreatorTools.tsx',
    'server/services/thumbnailGenerator.ts',
    'scripts/scope-guard.js'
  ],
  'viral-optimizer-hold': [
    'client/src/pages/tools/ViralOptimizer.tsx',
    'server/routers/viralOptimizer.ts',
    'server/routers/viralOptimizerRouter.ts',
    'server/services/viralOptimizer.ts',
    'scripts/scope-guard.js'
  ],
  'money-mission-hold': [
    'client/src/pages/KingMoneyMission.tsx',
    'server/routers/challengeAutomationRouter.ts',
    'scripts/scope-guard.js'
  ],
  'activation-war-room-guard': [
    'server/routers/activationWarRoomRouter.ts',
    'scripts/scope-guard.js'
  ],
  'brand-dna-hold': [
    'client/src/pages/KingCamCommandCenter.tsx',
    'server/routers/brandDNARouter.ts',
    'scripts/scope-guard.js'
  ],
  'agent-roster-truth': [
    'client/src/pages/AgentRoster.tsx',
    'scripts/scope-guard.js'
  ],
  'creator-video-studio-route': [
    'client/src/App.tsx',
    'client/src/pages/Dashboard.tsx',
    'client/src/pages/CreatorTools.tsx',
    'scripts/scope-guard.js'
  ],
  'caption-stage': [
    'client/src/App.tsx',
    'client/src/pages/CreatorVideoStudio.tsx',
    'client/src/pages/CaptionStage.tsx',
    'server/routers.ts',
    'server/routers/captionStageRouter.ts',
    'server/remotion/remotionRenderService.ts',
    'server/remotion/types.ts',
    'scripts/verify-caption-stage-render.ts',
    'server/routers/captionStageRouter.test.ts',
    'scripts/scope-guard.js'
  ],
  'campaign-visual-recovery': [
    'client/src/pages/CampaignVisualStudio.tsx',
    'client/src/pages/KingContent.tsx',
    'client/src/pages/Home.tsx',
    'client/src/App.tsx',
    'server/routers/campaignVisualRouter.ts',
    'server/routers.ts',
    'server/services/governedPolloService.ts',
    'server/services/creationProjectService.ts',
    'scripts/scope-guard.js'
  ],
  'design-image-pilot': [
    'server/services/governedPolloService.ts',
    'server/routers/designImagePilotRouter.ts',
    'server/routers.ts',
    'scripts/scope-guard.js'
  ],
  university: [
    'client/src/pages/University.tsx',
    'client/src/pages/UniversityEnrollSuccess.tsx',
    'server/routers.ts',
    'server/routers/courseVideoRouter.ts',
    'server/routers/universityV2Router.ts',
    'server/db-fgh.ts',
    'drizzle/schema.ts',
    'scripts/scope-guard.js'
  ],
  'social-empire': [
    'client/src/pages/SocialHub.tsx',
    'server/_core/index.ts',
    'server/routers.ts',
    'server/routers/socialSpineRouter.ts',
    'server/routers/distributionRouter.ts',
    'server/routers/followRouter.ts',
    'server/routers/notificationRouter.ts',
    'server/services/socialSpineService.ts',
    'server/services/socialSpineService.test.ts',
    'scripts/scope-guard.js'
  ],
  credibility: [
    'client/src/App.tsx',
    'client/src/components/AgeGate.tsx',
    'client/src/pages/Home.tsx',
    'client/src/pages/LegalPages.tsx',
    'client/src/pages/PublicCreatorLanding.tsx',
    'client/src/pages/Waitlist.tsx',
    'public/audio/vaultx-homepage-pulse.wav',
    'scripts/create-vaultx-homepage-audio.py',
    'scripts/route-owner.js',
    'scripts/scope-guard.js'
  ],
  coherence: [
    'client/src/App.tsx',
    'client/src/components/AppHeader.tsx',
    'client/src/pages/CreatorHome.tsx',
    'client/src/lib/productArchitecture.ts',
    'client/src/pages/Home.tsx',
    'client/src/pages/PublicCreatorLanding.tsx',
    'client/src/pages/VaultX.tsx',
    'scripts/scope-guard.js'
  ],
  'visual-world': [
    'client/src/pages/Home.tsx',
    'client/src/pages/VaultX.tsx',
    'client/src/lib/homepageMediaRegistry.ts',
    'client/public/images/home/body-cinema-arch-hero-poster.jpg',
    'client/public/images/home/luxury-gold-room-demo-poster.jpg',
    'scripts/scope-guard.js'
  ],
  'ffmpeg-technical-only': [
    'server/services/realRenderEngine.ts',
    'server/routers/videoStudioRouter.ts',
    'server/routers/videoEnhanceRouter.ts',
    'server/routers/signatureTransformEngine.ts',
    'server/routers/smartCaptions.ts',
    'server/services/automatedDirectorService.ts',
    'server/routers/vaultxRouter.ts',
    'client/src/lib/homepageMediaRegistry.ts',
    'scripts/scope-guard.js'
  ],
  'audio-intelligence': [
    'server/services/audioIntelligenceService.ts',
    'server/services/audioIntelligenceService.test.ts',
    'server/services/audioTimelinePlanner.ts',
    'server/services/audioTimelinePlanner.test.ts',
    'server/services/verify-governed-audio-chain.test.ts',
    'server/services/realRenderEngine.ts',
    'server/routers/audioIntelligenceRouter.ts',
    'server/routers/realEditorRouter.ts',
    'server/routers/musicLibrary.ts',
    'server/routers/bodyCinemaRouter.ts',
    'server/routers/videoUploadRouter.ts',
    'server/routers/socialSpineRouter.ts',
    'server/services/bodyCinemaEvidenceService.ts',
    'server/services/bodyCinemaOutputReviewService.ts',
    'server/services/socialSpineService.ts',
    'server/media-os/contracts/mediaContracts.ts',
    'server/routers.ts',
    'client/src/pages/VaultXEditor.tsx',
    'client/src/pages/VaultXDrop.tsx',
    'client/src/pages/SocialHub.tsx',
    'client/src/pages/MusicLibraryAgent.tsx',
    'package.json',
    'pnpm-lock.yaml',
    'scripts/scope-guard.js'
  ],
  'kingcam-content': [
    'client/src/App.tsx',
    'client/src/components/AppHeader.tsx',
    'client/src/components/MediaPicker.tsx',
    'client/src/lib/productArchitecture.ts',
    'client/src/pages/KingContent.tsx',
    'scripts/scope-guard.js'
  ],
  'trailer-maker': [
    'client/src/pages/TrailerStudio.tsx',
    'server/routers/trailerRouter.ts',
    'server/services/realRenderEngine.ts',
    'server/services/trailerEngine.ts',
    'server/services/audioTimelinePlanner.ts',
    'server/services/audioIntelligenceService.ts',
    'scripts/scope-guard.js',
    'scripts/verify-directed-trailer-render.ts',
    'scripts/governed-trailer-generation.ts',
    'scripts/verify-long-trailer-render.ts'
  ],
  'media-delivery': [
    'server/_core/index.ts',
    'scripts/scope-guard.js'
  ],
  'creation-kernel': [
    'server/services/creationProjectService.ts',
    'server/services/creationProofService.ts',
    'server/services/polloEmergencyFreeze.ts',
    'server/services/polloEmergencyFreeze.test.ts',
    'server/routers/creationProjectsRouter.ts',
    'server/routers/creationProofRouter.ts',
    'server/routers.ts',
    'client/src/lib/homepageMediaRegistry.ts',
    'client/src/pages/Home.tsx',
    'client/src/components/MediaPicker.tsx',
    'client/src/App.tsx',
    'client/src/pages/KingContent.tsx',
    'client/src/pages/KingCamVault.tsx',
    'client/src/pages/KingCamScriptWriter.tsx',
    'client/src/pages/Dashboard.tsx',
    'client/src/pages/CreatorVideoStudio.tsx',
    'client/src/pages/CreatorManagement.tsx',
    'client/src/pages/CloneEmpire.tsx',
    'client/src/pages/DubbingAI.tsx',
    'client/src/pages/SocialHub.tsx',
    'client/src/pages/TrailerStudio.tsx',
    'client/src/pages/VaultXDrop.tsx',
    'server/routers/videoUploadRouter.ts',
    'server/routers/mediaAssets.ts',
    'server/routers/trailerRouter.ts',
    'server/routers/realEditorRouter.ts',
    'server/services/bodyCinemaMotionProof.test.ts',
    'server/_core/index.ts',
    'scripts/scope-guard.js'
  ],
  'creation-arsenal': [
    'server/services/polloCapabilityRegistryService.ts',
    'server/services/creationModelRegistry.ts',
    'server/services/creationModelRegistry.test.ts',
    'server/services/creationModelSelection.ts',
    'server/services/creationDirector.ts',
    'server/services/governedPolloService.ts',
    'server/services/governedKingcamIdentityService.ts',
    'server/routers/governedPolloRouter.ts',
    'server/routers/governedKingcamIdentityRouter.ts',
    'server/routers/creationDirectorRouter.ts',
    'server/services/trailerEngine.ts',
    'server/routers/trailerRouter.ts',
    'server/routers/bodyCinemaRouter.ts',
    'server/routers/cloneEmpireRouter.ts',
    'server/services/bodyCinemaEvidenceService.ts',
    'server/services/bodyCinemaOutputReviewService.ts',
    'server/services/bodyCinemaAssemblyRecipe.ts',
    'server/services/bodyCinemaSourceMapService.ts',
    'server/services/bodyCinemaEditBlueprintService.ts',
    'server/services/bodyCinemaGoldStandardService.ts',
    'server/services/bodyCinemaExistingMediaProofService.ts',
    'server/routers.ts',
    'client/src/pages/KingContent.tsx',
    'client/src/pages/CloneEmpire.tsx',
    'client/src/pages/VaultXDrop.tsx',
    'client/src/pages/TrailerStudio.tsx',
    'client/src/App.tsx',
    'scripts/scope-guard.js'
  ],
  'realgpt': [
    'client/src/pages/AIBot.tsx',
    'server/services/aiBot.ts',
    'server/routers/aiBotRouter.ts',
    'server/_core/realGPT.ts',
    'scripts/scope-guard.js'
  ],
  'creator-language': [
    'client/src/pages/AIBot.tsx',
    'client/src/pages/CloneEmpire.tsx',
    'client/src/pages/CreatorEarnings.tsx',
    'client/src/pages/SocialHub.tsx',
    'scripts/scope-guard.js'
  ],
  'owner-registry': [
    'server/services/systemRegistry.ts',
    'scripts/scope-guard.js'
  ],
  'agent-safety-freeze': [
    'server/routers/challengeAutomationRouter.ts',
    'server/services/systemRegistry.ts',
    'scripts/scope-guard.js'
  ],
  'recruitment-consent': [
    'client/src/pages/OutreachCommandCenter.tsx',
    'server/routers/creatorOutreachRouter.ts',
    'scripts/scope-guard.js'
  ],
  'vaultx-acquisition-consent': [
    'server/routers/vaultxAcquisitionOperatorRouter.ts',
    'server/services/vaultxAutonomousAcquisitionOperator.ts',
    'scripts/scope-guard.js'
  ],
  'agent-command-authority': [
    'server/routers/agentExecutorRouter.ts',
    'server/routers/empireAgents.ts',
    'scripts/scope-guard.js'
  ],
  'agent-command-surface': [
    'client/src/App.tsx',
    'client/src/pages/AgentCommand.tsx',
    'server/routers/agentExecutorRouter.ts',
    'scripts/scope-guard.js'
  ],
  'flyer-recovery': [
    'client/src/App.tsx',
    'client/src/pages/MotionFlyerAgent.tsx',
    'server/routers/flyerStudioV2Router.ts',
    'server/remotion/compositions/MotionFlyerComposition.tsx',
    'server/remotion/remotionRenderService.ts',
    'server/remotion/Root.tsx',
    'server/remotion/types.ts',
    'scripts/scope-guard.js'
  ],
  'remotion-source-preserving-master': [
    'server/remotion/compositions/SourcePreservingMasterComposition.tsx',
    'server/remotion/remotionRenderService.ts',
    'server/remotion/Root.tsx',
    'server/remotion/types.ts',
    'server/services/creationDirector.ts',
    'server/services/creationModelRegistry.ts',
    'server/services/creationModelSelection.ts',
    'server/routers/creationDirectorRouter.ts',
    'server/routers.ts',
    'server/remotion/remotionRenderService.test.ts',
    'LEARNING_LOG.md',
    'scripts/scope-guard.js'
  ],
  'media-vault-recovery': [
    'client/src/components/MediaPicker.tsx',
    'client/src/pages/KingCamVault.tsx',
    'server/routers/mediaAssets.ts',
    'scripts/scope-guard.js'
  ],
  'body-cinema': [
    'AGENTS.md',
    'CREATORVAULT_STANDARD.md',
    'BODY_CINEMA_EVIDENCE_STANDARD.md',
    'BODY_CINEMA_EVIDENCE_LEDGER.md',
    'BODY_CINEMA_GOLD_STANDARD_LIBRARY.md',
    'BODY_CINEMA_VISUAL_INVENTORY.md',
    'BODY_CINEMA_STORY_DESIGN.md',
    'client/public/assets/final-drop.mp4',
    'client/public/assets/hero-transformation.mp4',
    'client/public/assets/intelligence-overlay.mp4',
    'client/public/assets/preview-abs.mp4',
    'client/public/assets/preview-arch.mp4',
    'client/public/assets/preview-back.mp4',
    'client/public/assets/preview-curves-360.mp4',
    'client/public/assets/preview-decollete.mp4',
    'client/public/assets/preview-hips.mp4',
    'client/public/assets/preview-legs.mp4',
    'client/public/assets/preview-lower-back.mp4',
    'client/public/assets/preview-mirror.mp4',
    'client/public/assets/preview-silhouette.mp4',
    'client/public/assets/preview-thigh.mp4',
    'client/public/assets/preview-waist.mp4',
    'client/src/lib/bodyCinemaPerception.ts',
    'client/src/pages/VaultXStudio.tsx',
    'client/src/pages/VaultXDrop.tsx',
    'client/src/components/MediaPicker.tsx',
    'client/src/pages/VaultXTruthLibrary.tsx',
    'client/src/App.tsx',
    'server/_core/index.ts',
    'server/routers/bodyCinemaRouter.ts',
    'server/routers/mediaAssets.ts',
    'server/routers/governedPolloRouter.ts',
    'server/routers/videoUploadRouter.ts',
    'server/routers/vaultxRouter.ts',
    'server/services/bodyCinemaEvidenceService.ts',
    'server/services/bodyCinemaAssemblyRecipe.ts',
    'server/services/realRenderEngine.ts',
    'server/services/bodyCinemaExistingMediaProofService.ts',
    'server/services/governedPolloService.ts',
    'server/services/polloCapabilityRegistryService.ts',
    'server/services/polloCapabilityRegistryService.test.ts',
    'server/services/bodyCinemaEvidence.test.ts',
    'server/services/bodyCinemaMotionProof.test.ts',
    'server/services/bodyCinemaOutputReviewService.ts',
    'server/services/bodyCinemaSourceMapService.ts',
    'server/services/bodyCinemaTopazPrecisionPolicy.ts',
    'server/services/bodyCinemaVaceWorkerContract.ts',
    'server/services/bodyCinemaVaceWorkerContract.test.ts',
    'server/services/vaceWorkerConnectionService.ts',
    'server/services/vaceWorkerConnectionService.test.ts',
    'server/services/vaceWorkerHealthService.ts',
    'server/services/digitalOceanVaceAutomationService.ts',
    'server/services/digitalOceanVaceAutomationService.test.ts',
    'server/services/digitalOceanVaceProvisioningService.ts',
    'server/services/digitalOceanVaceProvisioningService.test.ts',
    'server/services/digitalOceanVaceWorkerProvisioner.ts',
    'server/services/digitalOceanVaceWorkerProvisioner.test.ts',
    'workers/vace/Dockerfile',
    'workers/vace/requirements.txt',
    'workers/vace/app/main.py',
    'server/services/bodyCinemaTopazPrecisionPolicy.test.ts',
    'server/services/topazPrecisionVideoService.ts',
    'server/services/topazProductionActivationService.ts',
    'server/services/topazProductionActivationService.test.ts',
    'server/services/creationModelRegistry.ts',
    'server/services/creationModelSelection.ts',
    'server/services/creationModelSelection.test.ts',
    'server/services/bodyCinemaProviderResiliencePolicy.ts',
    'server/services/bodyCinemaProviderResilienceService.ts',
    'server/services/bodyCinemaProviderResilienceService.test.ts',
    'server/services/bodyCinemaVerifiedSourceAttestationService.ts',
    'server/services/creationDirector.ts',
    'package.json',
    'pnpm-lock.yaml',
    'scripts/scope-guard.js'
  ]
};

function splitFileList(output) {
  return output.trim().split('\n').filter(Boolean);
}

function getChangedFiles() {
  try {
    const trackedOutput = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
    const untrackedOutput = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' });
    return [...new Set([...splitFileList(trackedOutput), ...splitFileList(untrackedOutput)])];
  } catch (e) {
    console.log('No previous commit found, checking staged files...');
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return splitFileList(output);
  }
}

function checkScope(task, changedFiles) {
  const allowlist = ALLOWLISTS[task];
  if (!allowlist) {
    console.log(`Unknown task: ${task}`);
    return false;
  }

  const violations = changedFiles.filter(file => !allowlist.includes(file));

  if (violations.length > 0) {
    console.log(`❌ SCOPE VIOLATION: Task "${task}" can only modify:`);
    allowlist.forEach(file => console.log(`  ✅ ${file}`));
    console.log(`\n🚫 But you changed:`);
    violations.forEach(file => console.log(`  ❌ ${file}`));
    return false;
  }

  console.log(`✅ SCOPE CHECK PASSED: Task "${task}" only modified allowed files`);
  return true;
}

// CLI usage
const task = process.argv[2];
if (!task) {
  console.log('Usage: node scope-guard.js <task>');
  console.log('Available tasks:', Object.keys(ALLOWLISTS).join(', '));
  process.exit(1);
}

const changedFiles = getChangedFiles();
console.log('Changed files:', changedFiles);

const passed = checkScope(task, changedFiles);
process.exit(passed ? 0 : 1);