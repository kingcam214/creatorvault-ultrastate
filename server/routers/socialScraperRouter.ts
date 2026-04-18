import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const socialScraperRouter = router({
  analyzeProfile: protectedProcedure.input(z.object({ handle: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze the social media presence of @${input.handle} on ${input.platform}. Based on their handle and platform, estimate: content style, audience type, posting frequency, and monetization methods. Note: this is an AI estimate without live data.` }], max_tokens: 400 });
    return { analysis: c.choices[0].message.content, handle: input.handle, platform: input.platform };
  }),
  findNicheCreators: protectedProcedure.input(z.object({ niche: z.string(), platform: z.string(), followerRange: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Identify types of ${input.niche} creators on ${input.platform} with ${input.followerRange} followers. Describe: their content patterns, audience demographics, and collaboration potential.` }], max_tokens: 400 });
    return { creators: c.choices[0].message.content };
  }),
  getTrendingContent: protectedProcedure.input(z.object({ platform: z.string(), niche: z.string() })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `What content is trending in ${input.niche} on ${input.platform} right now? List 10 trending formats/topics with engagement patterns.` }], max_tokens: 400 });
    return { trending: c.choices[0].message.content };
  }),
});