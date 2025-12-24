import { invokeLLM } from "../_core/llm";
import { db } from "../db";
import { creatorAudits } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Social Media Audit Service
 * 
 * Analyzes creator social media accounts and generates monetization roadmaps.
 * Provides instant value to new creators joining CreatorVault.
 */

export interface SocialMediaProfile {
  platform: "instagram" | "tiktok" | "youtube" | "twitter";
  username: string;
  followers?: number;
  engagement?: number;
  contentType?: string;
}

export interface AuditResult {
  auditId: number;
  userId: string;
  profiles: SocialMediaProfile[];
  currentMonetizationPotential: number;
  strengths: string[];
  revenueOpportunities: string[];
  roadmap: {
    week1: string[];
    week2: string[];
    week3: string[];
    week4: string[];
  };
  firstThousandPlan: string;
  createdAt: Date;
}

/**
 * Scrape basic metrics from social media profile
 * (In production, this would use official APIs or scraping services)
 */
async function scrapeProfileMetrics(
  platform: string,
  username: string
): Promise<{ followers: number; engagement: number; contentType: string }> {
  // For MVP, generate realistic mock data based on platform
  // In production, integrate with social media APIs or scraping services
  
  const mockData = {
    instagram: {
      followers: Math.floor(Math.random() * 50000) + 1000,
      engagement: Math.random() * 8 + 2, // 2-10%
      contentType: ["lifestyle", "fitness", "beauty", "comedy", "education"][
        Math.floor(Math.random() * 5)
      ],
    },
    tiktok: {
      followers: Math.floor(Math.random() * 100000) + 500,
      engagement: Math.random() * 12 + 3, // 3-15%
      contentType: ["dance", "comedy", "education", "lifestyle", "food"][
        Math.floor(Math.random() * 5)
      ],
    },
    youtube: {
      followers: Math.floor(Math.random() * 20000) + 500,
      engagement: Math.random() * 5 + 1, // 1-6%
      contentType: ["vlog", "tutorial", "gaming", "review", "entertainment"][
        Math.floor(Math.random() * 5)
      ],
    },
    twitter: {
      followers: Math.floor(Math.random() * 30000) + 200,
      engagement: Math.random() * 3 + 0.5, // 0.5-3.5%
      contentType: ["commentary", "news", "humor", "personal", "business"][
        Math.floor(Math.random() * 5)
      ],
    },
  };

  return (
    mockData[platform as keyof typeof mockData] || mockData.instagram
  );
}

/**
 * Calculate monetization potential based on followers and engagement
 */
function calculateMonetizationPotential(
  profiles: SocialMediaProfile[]
): number {
  let totalPotential = 0;

  for (const profile of profiles) {
    const followers = profile.followers || 0;
    const engagement = profile.engagement || 0;

    // Formula: (followers * engagement% * platform multiplier) / 100
    const platformMultipliers = {
      instagram: 0.015,
      tiktok: 0.012,
      youtube: 0.025,
      twitter: 0.008,
    };

    const multiplier =
      platformMultipliers[profile.platform] || 0.01;
    const potential = (followers * engagement * multiplier) / 100;
    totalPotential += potential;
  }

  return Math.round(totalPotential);
}

/**
 * Generate AI-powered audit analysis
 */
async function generateAuditAnalysis(profiles: SocialMediaProfile[]): Promise<{
  strengths: string[];
  revenueOpportunities: string[];
  roadmap: {
    week1: string[];
    week2: string[];
    week3: string[];
    week4: string[];
  };
  firstThousandPlan: string;
}> {
  const profileSummary = profiles
    .map(
      (p) =>
        `${p.platform}: @${p.username} (${p.followers?.toLocaleString()} followers, ${p.engagement?.toFixed(1)}% engagement, ${p.contentType} content)`
    )
    .join("\n");

  const prompt = `You are a creator monetization expert analyzing social media accounts for CreatorVault.

CREATOR PROFILES:
${profileSummary}

Generate a comprehensive monetization audit with:

1. STRENGTHS (3-5 bullet points): What's working well in their content/audience
2. REVENUE OPPORTUNITIES (4-6 bullet points): Specific ways they can make money NOW
3. 30-DAY ROADMAP (4 weeks, 3-4 action items per week): Step-by-step plan to first $1,000
4. FIRST THOUSAND PLAN (1 paragraph): The fastest path to $1,000 based on their audience

Be specific, actionable, and realistic. Focus on CreatorVault features: subscriptions, tips, exclusive content, brand deals, affiliate marketing.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a creator monetization expert. Provide specific, actionable advice.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "audit_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "3-5 strengths of the creator's current presence",
            },
            revenueOpportunities: {
              type: "array",
              items: { type: "string" },
              description: "4-6 specific monetization opportunities",
            },
            roadmap: {
              type: "object",
              properties: {
                week1: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 action items for week 1",
                },
                week2: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 action items for week 2",
                },
                week3: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 action items for week 3",
                },
                week4: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 action items for week 4",
                },
              },
              required: ["week1", "week2", "week3", "week4"],
              additionalProperties: false,
            },
            firstThousandPlan: {
              type: "string",
              description:
                "1 paragraph describing the fastest path to $1,000",
            },
          },
          required: [
            "strengths",
            "revenueOpportunities",
            "roadmap",
            "firstThousandPlan",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in LLM response");
  }

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  return JSON.parse(contentStr);
}

/**
 * Run complete social media audit for a creator
 */
export async function runSocialMediaAudit(
  userId: string,
  profiles: Array<{ platform: string; username: string }>
): Promise<AuditResult> {
  // Step 1: Scrape metrics for each profile
  const enrichedProfiles: SocialMediaProfile[] = await Promise.all(
    profiles.map(async (p) => {
      const metrics = await scrapeProfileMetrics(p.platform, p.username);
      return {
        platform: p.platform as SocialMediaProfile["platform"],
        username: p.username,
        followers: metrics.followers,
        engagement: metrics.engagement,
        contentType: metrics.contentType,
      };
    })
  );

  // Step 2: Calculate monetization potential
  const monetizationPotential =
    calculateMonetizationPotential(enrichedProfiles);

  // Step 3: Generate AI analysis
  const analysis = await generateAuditAnalysis(enrichedProfiles);

  // Step 4: Save to database
  const result = await db
    .insert(creatorAudits)
    .values({
      userId,
      platforms: JSON.stringify(enrichedProfiles),
      monetizationPotential,
      strengths: JSON.stringify(analysis.strengths),
      revenueOpportunities: JSON.stringify(analysis.revenueOpportunities),
      roadmapWeek1: JSON.stringify(analysis.roadmap.week1),
      roadmapWeek2: JSON.stringify(analysis.roadmap.week2),
      roadmapWeek3: JSON.stringify(analysis.roadmap.week3),
      roadmapWeek4: JSON.stringify(analysis.roadmap.week4),
      firstThousandPlan: analysis.firstThousandPlan,
    });
  
  const auditId = Number((result as any).insertId);

  return {
    auditId,
    userId,
    profiles: enrichedProfiles,
    currentMonetizationPotential: monetizationPotential,
    strengths: analysis.strengths,
    revenueOpportunities: analysis.revenueOpportunities,
    roadmap: analysis.roadmap,
    firstThousandPlan: analysis.firstThousandPlan,
    createdAt: new Date(),
  };
}

/**
 * Get audit by ID
 */
export async function getAudit(auditId: number): Promise<AuditResult | null> {
  const [audit] = await db.select().from(creatorAudits).where(eq(creatorAudits.id, auditId)).limit(1);

  if (!audit) return null;

  return {
    auditId: audit.id,
    userId: audit.userId,
    profiles: JSON.parse(audit.platforms as string),
    currentMonetizationPotential: audit.monetizationPotential,
    strengths: JSON.parse(audit.strengths as string),
    revenueOpportunities: JSON.parse(audit.revenueOpportunities as string),
    roadmap: {
      week1: JSON.parse(audit.roadmapWeek1 as string),
      week2: JSON.parse(audit.roadmapWeek2 as string),
      week3: JSON.parse(audit.roadmapWeek3 as string),
      week4: JSON.parse(audit.roadmapWeek4 as string),
    },
    firstThousandPlan: audit.firstThousandPlan,
    createdAt: audit.createdAt!,
  };
}

/**
 * Get all audits for a user
 */
export async function getUserAudits(userId: string): Promise<AuditResult[]> {
  const audits = await db.select().from(creatorAudits).where(eq(creatorAudits.userId, userId)).orderBy((t: any) => t.createdAt);

  return audits.map((audit: any) => ({
    auditId: audit.id,
    userId: audit.userId,
    profiles: JSON.parse(audit.platforms as string),
    currentMonetizationPotential: audit.monetizationPotential,
    strengths: JSON.parse(audit.strengths as string),
    revenueOpportunities: JSON.parse(audit.revenueOpportunities as string),
    roadmap: {
      week1: JSON.parse(audit.roadmapWeek1 as string),
      week2: JSON.parse(audit.roadmapWeek2 as string),
      week3: JSON.parse(audit.roadmapWeek3 as string),
      week4: JSON.parse(audit.roadmapWeek4 as string),
    },
    firstThousandPlan: audit.firstThousandPlan,
    createdAt: audit.createdAt!,
  }));
}
