import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const whatsappContentRouter = router({
  generateWhatsAppContent: protectedProcedure.input(z.object({ type: z.string(), topic: z.string(), audience: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create WhatsApp ${input.type} content about "${input.topic}" for ${input.audience}. Keep it conversational, under 300 characters for status, or formatted for broadcast messages.` }], max_tokens: 300 });
    return { content: c.choices[0].message.content };
  }),
  createBroadcastList: protectedProcedure.input(z.object({ name: z.string(), contacts: z.array(z.string()) })).mutation(async ({ ctx, input }) => ({ id: Date.now(), name: input.name, contactCount: input.contacts.length, userId: ctx.user.id })),
  scheduleBroadcast: protectedProcedure.input(z.object({ message: z.string(), listId: z.number(), scheduledFor: z.string() })).mutation(async ({ input }) => ({ scheduled: true, listId: input.listId, scheduledFor: input.scheduledFor })),
  getWhatsAppTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "welcome", name: "Welcome Message" }, { id: "promo", name: "Promotion" }, { id: "update", name: "Update/Announcement" }, { id: "follow_up", name: "Follow Up" }] })),
});