import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function scrapeCreatorProfile(handle: string, platform: string) {
  const c = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Analyze the creator profile @${handle} on ${platform}. Estimate their content style, audience size range, engagement patterns, and niche. Note: AI estimate only.` }],
    max_tokens: 400
  });
  return {
    handle,
    platform,
    analysis: c.choices[0].message.content,
    estimatedFollowers: "unknown",
    contentStyle: "unknown",
    scrapedAt: new Date().toISOString()
  };
}

export async function findSimilarCreators(niche: string, platform: string) {
  const c = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: `Describe types of ${niche} creators on ${platform} and their content patterns.` }],
    max_tokens: 300
  });
  return { niche, platform, description: c.choices[0].message.content };
}
