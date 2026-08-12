#!/usr/bin/env node

import { execSync } from 'child_process';

// Task allowlists
const ALLOWLISTS = {
  homepage: [
    'client/src/pages/Home.tsx',
    'client/src/index.css',
    'client/index.html',
    'package.json',
    'pnpm-lock.yaml'
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
  vaultx: [
    'client/src/pages/VaultX.tsx',
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
  navigation: [
    'client/src/App.tsx',
    'client/src/components/AppHeader.tsx'
  ],
  distribution: [
    'client/src/pages/WhatsAppContentGenerator.tsx',
    'client/src/pages/TelegramMoneyHub.tsx',
    'scripts/scope-guard.js'
  ],
  'social-empire': [
    'client/src/pages/SocialHub.tsx',
    'server/_core/index.ts',
    'server/routers.ts',
    'server/routers/socialSpineRouter.ts',
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
    'package.json',
    'pnpm-lock.yaml',
    'scripts/scope-guard.js'
  ],
  'kingcam-content': [
    'client/src/App.tsx',
    'client/src/components/AppHeader.tsx',
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
    'server/routers/creationProjectsRouter.ts',
    'server/routers.ts',
    'client/src/pages/KingContent.tsx',
    'client/src/pages/VaultXDrop.tsx',
    'server/routers/videoUploadRouter.ts',
    'server/routers/mediaAssets.ts',
    'server/routers/realEditorRouter.ts',
    'server/_core/index.ts',
    'scripts/scope-guard.js'
  ],
  'creation-arsenal': [
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
    'server/routers.ts',
    'client/src/pages/KingContent.tsx',
    'client/src/pages/CloneEmpire.tsx',
    'client/src/pages/VaultXDrop.tsx',
    'client/src/pages/TrailerStudio.tsx',
    'client/src/App.tsx',
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
    'client/src/pages/VaultXTruthLibrary.tsx',
    'client/src/App.tsx',
    'server/_core/index.ts',
    'server/routers/bodyCinemaRouter.ts',
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