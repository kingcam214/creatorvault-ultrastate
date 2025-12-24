/**
 * 🎨 BRAND UNIVERSE - 12 BRANDS SYSTEM
 * 
 * Complete multi-brand ecosystem for CreatorVault
 * 
 * Version: 2.0
 * Integrated: December 23, 2024
 * Updated: December 23, 2024 (expanded to 12 brands)
 */

export interface Brand {
  name: string;
  tagline: string;
  colors: {
    primary: string;
    accent: string;
  };
  voice: string;
  target: string;
}

export const BRAND_UNIVERSE: Record<string, Brand> = {
  KINGCAM: {
    name: "KingCam",
    tagline: "King of Everything",
    colors: { primary: "#DAA520", accent: "#000000" },
    voice: "Confident, real, strategic, empowering",
    target: "Personal brand, face of empire"
  },

  CREATORVAULT: {
    name: "CreatorVault",
    tagline: "The Dopest App in the World",
    colors: { primary: "#8B5CF6", accent: "#EC4899" },
    voice: "Empowering, creator-first, street-smart + tech excellence",
    target: "All creators (US/DR/Haiti)"
  },

  BYDEVINEDESIGN: {
    name: "ByDevineDesign",
    tagline: "Industry Standard Since 2013",
    colors: { primary: "#2C3E50", accent: "#E74C3C" },
    voice: "Professional, polished, expert",
    target: "Graphics & design services"
  },

  DAYSHIFTDOCTOR: {
    name: "DayShift Doctor",
    tagline: "Monetize Every Shift",
    colors: { primary: "#FF1493", accent: "#FFD700" },
    voice: "Empowering, hustle-focused, club-savvy",
    target: "Strip club dancers and clubs"
  },

  VAULTGUARDIAN: {
    name: "VaultGuardian",
    tagline: "85% Is Yours. Always.",
    colors: { primary: "#DC143C", accent: "#FF69B4" },
    voice: "Safe, compliant, high-revenue, empowering",
    target: "Adult content creators"
  },

  CREATORVAULTDOMINICANA: {
    name: "CreatorVault Dominicana",
    tagline: "Pa' Lo' Creadores Dominicanos",
    colors: { primary: "#002D62", accent: "#CE1126" },
    voice: "Cultural, Spanish-first, community-driven",
    target: "Dominican Republic creators"
  },

  CREATORVAULTUNIVERSITY: {
    name: "CreatorVault University",
    tagline: "Learn. Earn. Grow.",
    colors: { primary: "#1E3A8A", accent: "#10B981" },
    voice: "Educational, supportive, results-focused",
    target: "Creators learning monetization"
  },

  VAULTMARKETPLACE: {
    name: "VaultMarketplace",
    tagline: "Sell Your Creations",
    colors: { primary: "#059669", accent: "#FBBF24" },
    voice: "Commerce-focused, creator-friendly",
    target: "Creators selling products"
  },

  VAULTREMIX: {
    name: "VaultRemix",
    tagline: "Hollywood Quality. Creator Budget.",
    colors: { primary: "#7C3AED", accent: "#F59E0B" },
    voice: "Professional, AI-powered, democratizing",
    target: "Video creators"
  },

  VAULTPAY: {
    name: "VaultPay",
    tagline: "Know Your Worth",
    colors: { primary: "#10B981", accent: "#3B82F6" },
    voice: "Data-driven, transparent, empowering",
    target: "Creators planning revenue"
  },

  EMMANETWORK: {
    name: "Emma Network",
    tagline: "2,000+ Creadores Dominicanos",
    colors: { primary: "#DC2626", accent: "#FBBF24" },
    voice: "Community-driven, recruiter-focused, cultural",
    target: "Dominican recruiters and creators"
  },

  KINGFRAME: {
    name: "KingFrame",
    tagline: "Self-Hosted AI. Zero Limits.",
    colors: { primary: "#6366F1", accent: "#EC4899" },
    voice: "Technical, powerful, cost-efficient",
    target: "AI infrastructure (internal)"
  },

  // Legacy brands (kept for backward compatibility)
  POPMYSHIT: {
    name: "PopMySh*t",
    tagline: "Content That POPS",
    colors: { primary: "#FF6B35", accent: "#FFD23F" },
    voice: "Explosive, energetic, unapologetic",
    target: "Viral content creators"
  },
  
  REALESTALIVE: {
    name: "#RealestAlive",
    tagline: "Authenticity Over Everything",
    colors: { primary: "#DAA520", accent: "#00FFFF" },
    voice: "Authentic, direct, no-BS",
    target: "Reality-based creators"
  },
  
  BOSSMODE: {
    name: "Bossmode",
    tagline: "Level Up or Stay Broke",
    colors: { primary: "#00D9FF", accent: "#10F49A" },
    voice: "Hustle-focused, data-driven",
    target: "Entrepreneur creators"
  }
};

/**
 * Get brand configuration by ID
 */
export function getBrand(brandId: string): Brand | null {
  const normalized = brandId.toUpperCase().replace(/[^A-Z]/g, "");
  return BRAND_UNIVERSE[normalized] || null;
}

/**
 * Get all available brands
 */
export function getAllBrands(): Brand[] {
  return Object.values(BRAND_UNIVERSE);
}

/**
 * Get brand-specific content prompt for LLM
 */
export function getBrandPrompt(brandId: string): string {
  const brand = getBrand(brandId);
  if (!brand) return "";

  return `
BRAND CONTEXT: ${brand.name}
Tagline: ${brand.tagline}
Voice: ${brand.voice}
Target Audience: ${brand.target}

Embody this brand's voice and values in your response.
`;
}

/**
 * Get default brand for a user based on their profile
 */
export function getDefaultBrand(userProfile: {
  contentType?: string[];
  country?: string;
  creatorType?: string;
}): string {
  // DR/Haiti creators default to CreatorVault
  if (userProfile.country === "DR" || userProfile.country === "HT") {
    return "CREATORVAULT";
  }

  // Viral/entertainment creators → PopMyShit
  if (userProfile.contentType?.some(t => ["viral", "entertainment", "comedy"].includes(t))) {
    return "POPMYSHIT";
  }

  // Business/entrepreneur creators → Bossmode
  if (userProfile.contentType?.some(t => ["business", "entrepreneur", "finance"].includes(t))) {
    return "BOSSMODE";
  }

  // Established brands/agencies → ByDevineDesign
  if (userProfile.creatorType === "agency" || userProfile.creatorType === "brand") {
    return "BYDEVINEDESIGN";
  }

  // Authenticity-focused creators → RealestAlive
  if (userProfile.contentType?.some(t => ["lifestyle", "personal", "documentary"].includes(t))) {
    return "REALESTALIVE";
  }

  // Default to CreatorVault
  return "CREATORVAULT";
}
