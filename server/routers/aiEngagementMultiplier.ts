import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiEngagementMultiplierRouter = router({
  optimizePost: protectedProcedure.input(z.object({
    originalPost: z.string(),
    platform: z.string(),
    currentEngagementRate: z.number().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Optimize this ${input.platform} post for maximum engagement:

Original: ${input.originalPost}

Provide: 1) Optimized version, 2) Hook improvements, 3) CTA optimization, 4) Hashtag strategy, 5) Best posting time, 6) Predicted engagement lift %.`,
      }],
      max_tokens: 600,
    });
    return { optimized: completion.choices[0].message.content };
  }),

  generateEngagementHooks: protectedProcedure.input(z.object({
    topic: z.string(),
    platform: z.string(),
    count: z.number().min(1).max(10).default(5),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate ${input.count} high-engagement hooks for ${input.platform} about "${input.topic}". Each hook should stop the scroll and create curiosity. Format as numbered list.`,
      }],
      max_tokens: 400,
    });
    return { hooks: completion.choices[0].message.content };
  }),

  analyzeEngagementPatterns: protectedProcedure.input(z.object({
    posts: z.array(z.object({
      content: z.string(),
      likes: z.number(),
      comments: z.number(),
      shares: z.number(),
    })),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Analyze these posts and identify engagement patterns:
${JSON.stringify(input.posts.slice(0, 5))}

Identify: what's working, what's not, content patterns that drive engagement, and specific recommendations.`,
      }],
      max_tokens: 500,
    });
    return { patterns: completion.choices[0].message.content };
  }),
});
