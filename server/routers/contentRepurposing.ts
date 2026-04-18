import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const contentRepurposingRouter = router({
  repurposeContent: protectedProcedure.input(z.object({
    originalContent: z.string(),
    originalFormat: z.string(),
    targetFormats: z.array(z.string()),
    targetPlatforms: z.array(z.string()),
  })).mutation(async ({ ctx, input }) => {
    const results = await Promise.all(
      input.targetFormats.slice(0, 3).map(async (format, i) => {
        const platform = input.targetPlatforms[i] || input.targetPlatforms[0];
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `Repurpose this ${input.originalFormat} into a ${format} for ${platform}:

${input.originalContent}

Make it platform-native and optimized for ${format} format.`,
          }],
          max_tokens: 400,
        });
        return { format, platform, content: completion.choices[0].message.content };
      })
    );
    return { repurposed: results };
  }),

  getRepurposingMap: protectedProcedure.input(z.object({
    sourceFormat: z.string(),
  })).query(async ({ input }) => {
    const maps: Record<string, string[]> = {
      "youtube_video": ["tiktok_clip", "instagram_reel", "twitter_thread", "blog_post", "email_newsletter", "podcast_episode"],
      "blog_post": ["twitter_thread", "instagram_carousel", "linkedin_post", "email", "video_script"],
      "podcast": ["blog_post", "twitter_thread", "instagram_quote_cards", "youtube_shorts"],
      "tweet": ["instagram_post", "linkedin_post", "email_tip"],
    };
    return { formats: maps[input.sourceFormat] || ["social_post", "email", "video_script"] };
  }),
});
