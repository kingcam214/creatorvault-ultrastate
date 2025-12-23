/**
 * 🎨 BRAND UNIVERSE - 5 BRANDS SYSTEM
 * 
 * Multi-brand support for CreatorVault ecosystem
 * 
 * Version: 1.0
 * Integrated: December 23, 2024
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
  },
  
  BYDEVINEDESIGN: {
    name: "ByDevineDesign",
    tagline: "Industry Standard Since 2013",
    colors: { primary: "#2C3E50", accent: "#E74C3C" },
    voice: "Professional, polished, expert",
    target: "Established brands"
  },
  
  CREATORVAULT: {
    name: "CreatorVault",
    tagline: "The Dopest App in the World",
    colors: { primary: "#DAA520", accent: "#00FFFF" },
    voice: "Empowering, creator-first",
    target: "All creators (US/DR/Haiti)"
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
