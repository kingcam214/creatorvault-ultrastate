/**
 * PROOF GATE - Feature Reality Enforcement
 * 
 * Shows what's REAL (touches users/data/money) vs NOT REAL (placeholder)
 */

export type FeatureStatus = "REAL" | "PARTIAL" | "NOT_REAL";

export interface Feature {
  id: string;
  name: string;
  status: FeatureStatus;
  description: string;
  missingRequirements?: string[];
  lastProofTimestamp?: number;
}

export const FEATURE_REGISTRY: Record<string, Feature> = {
  // FULLY REAL
  vaultPay: {
    id: "vaultPay",
    name: "VaultPay Revenue Calculator",
    status: "REAL",
    description: "85/15 split calculator, platform comparison, growth projections, tax estimation",
  },
  dayShiftDoctor: {
    id: "dayShiftDoctor",
    name: "DayShift Doctor",
    status: "REAL",
    description: "Strip club vertical with Dallas clubs, shift calculator, VIP splits",
  },
  aiBot: {
    id: "aiBot",
    name: "AI Bot",
    status: "REAL",
    description: "Role-aware AI responses, onboarding plans, script generation",
  },
  viralOptimizer: {
    id: "viralOptimizer",
    name: "Viral Optimizer",
    status: "REAL",
    description: "Content analysis, hook generation, thumbnail optimization, viral scoring",
  },
  ownerControl: {
    id: "ownerControl",
    name: "Owner Control Panel",
    status: "REAL",
    description: "System registry, bot management, database health monitoring",
  },
  commandHub: {
    id: "commandHub",
    name: "Command Hub",
    status: "REAL",
    description: "Command execution, database logging, 6 command types",
  },
  creatorTools: {
    id: "creatorTools",
    name: "Creator Tools",
    status: "REAL",
    description: "Video Studio, Content Scheduler, Analytics, Platform Connections",
  },
  hollywoodReplacement: {
    id: "hollywoodReplacement",
    name: "Hollywood Replacement",
    status: "REAL",
    description: "AI production cost/timeline comparison, project estimates",
  },

  // PARTIALLY REAL
  vaultLive: {
    id: "vaultLive",
    name: "VaultLive",
    status: "PARTIAL",
    description: "Live streaming + tips with 85/15 split",
    missingRequirements: [
      "Stripe sandbox not claimed",
      "Webhook not configured with production URL",
      "No real transactions tested",
    ],
  },
  marketplace: {
    id: "marketplace",
    name: "Marketplace",
    status: "PARTIAL",
    description: "Product sales with 70/20/10 commission split",
    missingRequirements: [
      "0 products created",
      "0 transactions executed",
      "Webhook not tested",
    ],
  },
  university: {
    id: "university",
    name: "CreatorVault University",
    status: "PARTIAL",
    description: "Course platform with enrollment tracking",
    missingRequirements: [
      "0 courses created",
      "0 enrollments",
      "No course content delivery system",
    ],
  },
  telegramBot: {
    id: "telegramBot",
    name: "Telegram Bot",
    status: "PARTIAL",
    description: "Broadcast, DM funnels, lead collection",
    missingRequirements: [
      "No real bot token registered",
      "No real bot deployed",
      "Simulated only",
    ],
  },
  whatsappBot: {
    id: "whatsappBot",
    name: "WhatsApp Bot",
    status: "PARTIAL",
    description: "Opt-in flows, creator funnels",
    missingRequirements: [
      "No real provider connected",
      "No real messages sent",
      "Simulated only",
    ],
  },
  emmaNetwork: {
    id: "emmaNetwork",
    name: "Emma Network",
    status: "PARTIAL",
    description: "Influencer recruiting with commission tracking",
    missingRequirements: [
      "0 recruiters registered",
      "0 recruits",
      "No commission payouts executed",
    ],
  },
  adultSalesBot: {
    id: "adultSalesBot",
    name: "Adult Sales Bot",
    status: "PARTIAL",
    description: "Payment verification, buyer tagging, safety guardrails",
    missingRequirements: [
      "Not tested with real transactions",
      "No real buyers",
      "No real content delivery",
    ],
  },

  // NOT REAL
  liveRooms: {
    id: "liveRooms",
    name: "LIVE Rooms",
    status: "NOT_REAL",
    description: "Real-time chat, reactions, creator presence",
    missingRequirements: [
      "No real-time chat",
      "No reactions",
      "No presence indicators",
    ],
  },
  kingcamDemos: {
    id: "kingcamDemos",
    name: "KingCam Demos",
    status: "NOT_REAL",
    description: "Dominican and Adult demo content generation",
    missingRequirements: [
      "0 demos generated",
      "Page shows empty state",
    ],
  },
  contentRepurposing: {
    id: "contentRepurposing",
    name: "Content Repurposing",
    status: "NOT_REAL",
    description: "Video/url/text → platform packs (TikTok/IG/YT)",
    missingRequirements: [
      "No database tables",
      "No UI page",
      "No artifacts generated",
    ],
  },
  podcastSector: {
    id: "podcastSector",
    name: "Podcast Sector",
    status: "NOT_REAL",
    description: "RSS ingest, clip generation, analytics",
    missingRequirements: [
      "No database tables",
      "No UI page",
      "No RSS ingest",
    ],
  },
  vaultRemix: {
    id: "vaultRemix",
    name: "VaultRemix",
    status: "NOT_REAL",
    description: "Video production tools brand",
    missingRequirements: [
      "No dedicated service",
      "No UI page",
      "Not branded",
    ],
  },
  kingFrame: {
    id: "kingFrame",
    name: "KingFrame",
    status: "NOT_REAL",
    description: "AI orchestration brand",
    missingRequirements: [
      "No dedicated service",
      "No UI page",
      "Not branded",
    ],
  },
  creatorVaultDominicana: {
    id: "creatorVaultDominicana",
    name: "CreatorVault Dominicana",
    status: "NOT_REAL",
    description: "Dominican market division",
    missingRequirements: [
      "No dedicated UI",
      "No Dominican-specific features",
    ],
  },
};

export function getFeatureStatus(featureId: string): Feature | null {
  return FEATURE_REGISTRY[featureId] || null;
}

export function getAllFeatures(): Feature[] {
  return Object.values(FEATURE_REGISTRY);
}

export function getFeaturesByStatus(status: FeatureStatus): Feature[] {
  return Object.values(FEATURE_REGISTRY).filter(f => f.status === status);
}

export function assertFeatureReal(featureId: string): void {
  const feature = FEATURE_REGISTRY[featureId];
  if (!feature) {
    throw new Error(`Feature ${featureId} not found in registry`);
  }
  if (feature.status !== "REAL") {
    throw new Error(
      `Feature ${feature.name} is ${feature.status}. Missing: ${feature.missingRequirements?.join(", ")}`
    );
  }
}
