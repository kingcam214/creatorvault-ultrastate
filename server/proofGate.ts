/**
 * PROOF GATE — HARD ENFORCEMENT
 * 
 * RULE: If a feature does not touch REAL users, REAL data, or REAL money, it DOES NOT EXIST.
 * 
 * This module enforces that rule by:
 * 1. Maintaining a registry of features with required proofs
 * 2. Checking if features meet reality requirements
 * 3. Blocking UI access to NOT REAL features
 */

import { getDb } from "./db";
import fs from "fs/promises";
import path from "path";

// ============ TYPES ============

export type FeatureStatus = "REAL" | "NOT_REAL" | "UNKNOWN";

export interface FeatureRequirements {
  requiresDB: boolean;
  requiresArtifacts: boolean;
  requiresMoney: boolean;
  requiresUserVisible: boolean;
  requiredTables?: string[];
  requiredRoutes?: string[];
  proofMaxAgeDays?: number; // How recent must the last proof be?
}

export interface Feature {
  id: string;
  name: string;
  category: "marketplace" | "university" | "services" | "social" | "telegram" | "whatsapp" | "repurpose" | "podcast" | "system";
  requirements: FeatureRequirements;
  status?: FeatureStatus;
  lastProofTimestamp?: string;
  missingRequirements?: string[];
}

export interface ProofEvent {
  ts: string;
  actor: string;
  action: string;
  featureId?: string;
  inputs: Record<string, any>;
  dbWrites: Array<{ table: string; id: string | number }>;
  artifacts: string[];
  money: Array<{ provider: string; id: string; amount: number; currency: string }>;
  status: "success" | "failure";
}

// ============ FEATURE REGISTRY ============

const FEATURE_REGISTRY: Feature[] = [
  // MARKETPLACE
  {
    id: "marketplace.browse",
    name: "Browse Marketplace",
    category: "marketplace",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: false,
      requiresUserVisible: true,
      requiredTables: ["marketplaceProducts"],
    },
  },
  {
    id: "marketplace.createProduct",
    name: "Create Product",
    category: "marketplace",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: false,
      requiresUserVisible: true,
      requiredTables: ["marketplaceProducts"],
      requiredRoutes: ["/api/marketplace/createProduct"],
    },
  },
  {
    id: "marketplace.checkout",
    name: "Checkout & Purchase",
    category: "marketplace",
    requirements: {
      requiresDB: true,
      requiresArtifacts: true,
      requiresMoney: true,
      requiresUserVisible: true,
      requiredTables: ["marketplaceProducts", "marketplaceOrders", "payments"],
      proofMaxAgeDays: 30,
    },
  },
  
  // UNIVERSITY
  {
    id: "university.browse",
    name: "Browse Courses",
    category: "university",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: false,
      requiresUserVisible: true,
      requiredTables: ["universityCourses"],
    },
  },
  {
    id: "university.createCourse",
    name: "Create Course",
    category: "university",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: false,
      requiresUserVisible: true,
      requiredTables: ["universityCourses"],
    },
  },
  {
    id: "university.enroll",
    name: "Course Enrollment",
    category: "university",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: true,
      requiresUserVisible: true,
      requiredTables: ["universityCourses", "universityEnrollments", "payments"],
      proofMaxAgeDays: 30,
    },
  },
  
  // SERVICES
  {
    id: "services.browse",
    name: "Browse Services",
    category: "services",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: false,
      requiresUserVisible: true,
      requiredTables: ["servicesOffers"],
    },
  },
  {
    id: "services.createOffer",
    name: "Create Service Offer",
    category: "services",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: false,
      requiresUserVisible: true,
      requiredTables: ["servicesOffers"],
    },
  },
  {
    id: "services.purchase",
    name: "Purchase Service",
    category: "services",
    requirements: {
      requiresDB: true,
      requiresArtifacts: true,
      requiresMoney: true,
      requiresUserVisible: true,
      requiredTables: ["servicesOffers", "servicesSales", "payments"],
      proofMaxAgeDays: 30,
    },
  },
  
  // TELEGRAM
  {
    id: "telegram.deployBot",
    name: "Deploy Telegram Bot",
    category: "telegram",
    requirements: {
      requiresDB: true,
      requiresArtifacts: true,
      requiresMoney: false,
      requiresUserVisible: true,
      proofMaxAgeDays: 7,
    },
  },
  {
    id: "telegram.createFunnel",
    name: "Create Telegram Funnel",
    category: "telegram",
    requirements: {
      requiresDB: true,
      requiresArtifacts: true,
      requiresMoney: false,
      requiresUserVisible: true,
      proofMaxAgeDays: 7,
    },
  },
  
  // WHATSAPP
  {
    id: "whatsapp.deployBot",
    name: "Deploy WhatsApp Bot",
    category: "whatsapp",
    requirements: {
      requiresDB: true,
      requiresArtifacts: true,
      requiresMoney: false,
      requiresUserVisible: true,
      proofMaxAgeDays: 7,
    },
  },
  
  // CONTENT REPURPOSING
  {
    id: "repurpose.createJob",
    name: "Create Repurpose Job",
    category: "repurpose",
    requirements: {
      requiresDB: true,
      requiresArtifacts: true,
      requiresMoney: false,
      requiresUserVisible: true,
      proofMaxAgeDays: 7,
    },
  },
  
  // PODCAST
  {
    id: "podcast.createShow",
    name: "Create Podcast Show",
    category: "podcast",
    requirements: {
      requiresDB: true,
      requiresArtifacts: false,
      requiresMoney: false,
      requiresUserVisible: true,
      proofMaxAgeDays: 7,
    },
  },
  {
    id: "podcast.ingestEpisode",
    name: "Ingest Podcast Episode",
    category: "podcast",
    requirements: {
      requiresDB: true,
      requiresArtifacts: true,
      requiresMoney: false,
      requiresUserVisible: true,
      proofMaxAgeDays: 7,
    },
  },
];

// ============ PROOF GATE LOGIC ============

const PROOF_LOG_PATH = "/tmp/kingcam-proof/proof.jsonl";

/**
 * Check if a feature meets all reality requirements
 */
export async function assertFeatureReal(featureId: string): Promise<{
  status: FeatureStatus;
  missingRequirements: string[];
  lastProofTimestamp?: string;
}> {
  const feature = FEATURE_REGISTRY.find((f) => f.id === featureId);
  if (!feature) {
    return {
      status: "UNKNOWN",
      missingRequirements: ["Feature not registered"],
    };
  }

  const missing: string[] = [];

  // Check DB connectivity
  if (feature.requirements.requiresDB) {
    const db = await getDb();
    if (!db) {
      missing.push("Database not available");
    } else {
      // Check required tables exist
      if (feature.requirements.requiredTables) {
        try {
          const result = await db.execute("SHOW TABLES");
          const tables = Array.isArray(result) ? result[0] : result;
          const tableNames = (tables as unknown as any[]).map((t: any) => Object.values(t)[0]);
          
          for (const requiredTable of feature.requirements.requiredTables) {
            if (!tableNames.includes(requiredTable)) {
              missing.push(`Table '${requiredTable}' does not exist`);
            }
          }
        } catch (err) {
          missing.push(`Failed to check tables: ${err}`);
        }
      }
    }
  }

  // Check proof events
  if (feature.requirements.proofMaxAgeDays) {
    const lastProof = await getLastProofEvent(featureId);
    if (!lastProof) {
      missing.push(`No proof event found for feature '${featureId}'`);
    } else {
      const proofAge = Date.now() - new Date(lastProof.ts).getTime();
      const maxAge = feature.requirements.proofMaxAgeDays * 24 * 60 * 60 * 1000;
      if (proofAge > maxAge) {
        missing.push(`Last proof is too old (${Math.floor(proofAge / (24 * 60 * 60 * 1000))} days)`);
      }
    }
  }

  const status: FeatureStatus = missing.length === 0 ? "REAL" : "NOT_REAL";
  const lastProof = await getLastProofEvent(featureId);

  return {
    status,
    missingRequirements: missing,
    lastProofTimestamp: lastProof?.ts,
  };
}

/**
 * Get all features with their current status
 */
export async function getAllFeatures(): Promise<Feature[]> {
  const features = await Promise.all(
    FEATURE_REGISTRY.map(async (feature) => {
      const check = await assertFeatureReal(feature.id);
      return {
        ...feature,
        status: check.status,
        lastProofTimestamp: check.lastProofTimestamp,
        missingRequirements: check.missingRequirements,
      };
    })
  );
  return features;
}

/**
 * Get features by category
 */
export async function getFeaturesByCategory(category: string): Promise<Feature[]> {
  const allFeatures = await getAllFeatures();
  return allFeatures.filter((f) => f.category === category);
}

/**
 * Write a proof event to the log
 */
export async function writeProofEvent(event: ProofEvent): Promise<void> {
  const line = JSON.stringify(event) + "\n";
  await fs.appendFile(PROOF_LOG_PATH, line, "utf-8");
}

/**
 * Get the last proof event for a feature
 */
export async function getLastProofEvent(featureId: string): Promise<ProofEvent | null> {
  try {
    const content = await fs.readFile(PROOF_LOG_PATH, "utf-8");
    const lines = content.trim().split("\n");
    
    // Search from end to beginning
    for (let i = lines.length - 1; i >= 0; i--) {
      const event = JSON.parse(lines[i]) as ProofEvent;
      if (event.featureId === featureId && event.status === "success") {
        return event;
      }
    }
    
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Get all proof events (most recent first)
 */
export async function getAllProofEvents(limit = 100): Promise<ProofEvent[]> {
  try {
    const content = await fs.readFile(PROOF_LOG_PATH, "utf-8");
    const lines = content.trim().split("\n");
    
    const events = lines
      .reverse()
      .slice(0, limit)
      .map((line) => JSON.parse(line) as ProofEvent);
    
    return events;
  } catch (err) {
    return [];
  }
}
