import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const emmaLeadsRouter = router({
  getLeads: protectedProcedure.query(async ({ ctx }) => {
    const leads = await db.db.select()
      .from(db.schema.leads)
    // @ts-ignore
      .where(eq(db.schema.leads.userId, ctx.user.id))
      .orderBy(desc(db.schema.leads.createdAt))
      .limit(50);
    return leads;
  }),

  addLead: protectedProcedure.input(z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    platform: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const [lead] = await db.db.insert(db.schema.leads).values({
      userId: ctx.user.id,
      name: input.name,
      email: input.email || "",
      phone: input.phone || "",
      platform: input.platform || "",
      source: input.source || "manual",
      notes: input.notes || "",
      status: "new",
      createdAt: new Date(),
    }).$returningId();
    return { id: lead.id, ...input };
  }),

  generateLeadMessage: protectedProcedure.input(z.object({
    leadName: z.string(),
    leadInterest: z.string(),
    messageType: z.enum(["intro", "follow_up", "offer", "nurture"]),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Write a ${input.messageType} message for lead ${input.leadName} interested in ${input.leadInterest}. Make it personal, value-first, and non-salesy. Under 100 words.`,
      }],
      max_tokens: 200,
    });
    return { message: completion.choices[0].message.content };
  }),
});
