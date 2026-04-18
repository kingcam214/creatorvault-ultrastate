import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const emmaContentRouter = router({
  generateEmmaContent: protectedProcedure.input(z.object({
    topic: z.string(),
    platform: z.string(),
    style: z.string().optional(),
    targetAudience: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are EMMA, an AI content creator for the CreatorVault platform. Create engaging, authentic content that resonates with creators and their audiences.",
        },
        {
          role: "user",
          content: `Create ${input.platform} content about "${input.topic}"${input.style ? ` in ${input.style} style` : ""}${input.targetAudience ? ` for ${input.targetAudience}` : ""}.`,
        },
      ],
      max_tokens: 500,
    });
    
    await db.db.insert(db.schema.content).values({
      userId: ctx.user.id,
      type: "ai_generated",
      platform: input.platform,
      body: completion.choices[0].message.content || "",
      status: "draft",
      createdAt: new Date(),
    });
    
    return { content: completion.choices[0].message.content };
  }),

  getEmmaContentHistory: protectedProcedure.query(async ({ ctx }) => {
    const history = await db.db.select()
      .from(db.schema.content)
      .where(eq(db.schema.content.userId, ctx.user.id))
      .orderBy(desc(db.schema.content.createdAt))
      .limit(20);
    return history;
  }),
});
