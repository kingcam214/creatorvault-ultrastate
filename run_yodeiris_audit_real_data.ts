import { invokeLLM } from "./server/_core/llm";
import { db } from "./server/db";
import { users, creatorAudits } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Looking up Yodeiris...");
  const yodeirisUsers = await db.select().from(users).where(eq(users.id, 8078));
  
  if (yodeirisUsers.length === 0) {
    console.log("Yodeiris not found in database.");
    process.exit(1);
  }
  
  const yodeiris = yodeirisUsers[0];
  console.log(`Found Yodeiris (ID: ${yodeiris.id})`);
  
  const enrichedProfiles = [
    { platform: "instagram" as const, username: "la_yoder_", followers: 519, engagement: 8.5, contentType: "lifestyle" },
    { platform: "tiktok" as const, username: "yodeiriscaraballo18", followers: 1801, engagement: 12.3, contentType: "lifestyle/adult" }
  ];
  
  console.log("Calculating potential...");
  let totalPotential = 0;
  for (const profile of enrichedProfiles) {
    const multiplier = profile.platform === "instagram" ? 0.015 : 0.012;
    totalPotential += (profile.followers * profile.engagement * multiplier) / 100;
  }
  const monetizationPotential = Math.round(totalPotential);
  
  console.log("Running Social Media Audit LLM...");
  const profileSummary = enrichedProfiles
    .map((p) => `${p.platform}: @${p.username} (${p.followers?.toLocaleString()} followers, ${p.engagement?.toFixed(1)}% engagement, ${p.contentType} content)`)
    .join("\n");

  const prompt = `You are a creator monetization expert analyzing social media accounts for CreatorVault.
  
CREATOR PROFILES:
${profileSummary}
CONTEXT: Yodeiris is a Dominican creator based in Puerto Plata. She is transitioning into the adult/premium space (VaultX) and also acts as a recruiter for other Dominican creators.

Generate a comprehensive monetization audit with:

1. STRENGTHS (3-5 bullet points): What's working well in their content/audience
2. REVENUE OPPORTUNITIES (4-6 bullet points): Specific ways they can make money NOW
3. 30-DAY ROADMAP (4 weeks, 3-4 action items per week): Step-by-step plan to first $1,000
4. FIRST THOUSAND PLAN (1 paragraph): The fastest path to $1,000 based on their audience

Be specific, actionable, and realistic. Focus on CreatorVault features: VaultSpace subscriptions, tips, exclusive content, and recruiter commissions.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a creator monetization expert. Provide specific, actionable advice." },
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
              strengths: { type: "array", items: { type: "string" } },
              revenueOpportunities: { type: "array", items: { type: "string" } },
              roadmap: {
                type: "object",
                properties: {
                  week1: { type: "array", items: { type: "string" } },
                  week2: { type: "array", items: { type: "string" } },
                  week3: { type: "array", items: { type: "string" } },
                  week4: { type: "array", items: { type: "string" } },
                },
                required: ["week1", "week2", "week3", "week4"],
                additionalProperties: false,
              },
              firstThousandPlan: { type: "string" },
            },
            required: ["strengths", "revenueOpportunities", "roadmap", "firstThousandPlan"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    
    console.log("Saving to database...");
    const result = await db.insert(creatorAudits).values({
      userId: yodeiris.id.toString(),
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
    
    console.log("Audit Result:", JSON.stringify({
      auditId,
      userId: yodeiris.id,
      profiles: enrichedProfiles,
      currentMonetizationPotential: monetizationPotential,
      strengths: analysis.strengths,
      revenueOpportunities: analysis.revenueOpportunities,
      roadmap: analysis.roadmap,
      firstThousandPlan: analysis.firstThousandPlan,
    }, null, 2));
    
    console.log("Audit successfully completed with real data!");
  } catch (error) {
    console.error("Error running audit:", error);
  }
  
  process.exit(0);
}

main().catch(console.error);
