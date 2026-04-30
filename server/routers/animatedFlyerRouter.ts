import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const animatedFlyerRouter = router({
  generateFlyerCopy: protectedProcedure.input(z.object({
    eventName: z.string(), date: z.string(), location: z.string(), description: z.string(), style: z.string().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create animated flyer copy for:
Event: ${input.eventName}
Date: ${input.date}
Location: ${input.location}
Description: ${input.description}
Style: ${input.style || "modern"}

Provide: headline, subheadline, key details layout, CTA, and animation suggestions for each element.` }],
      max_tokens: 500,
    });
    return { copy: completion.choices[0].message.content };
  }),
  getFlyerTemplates: protectedProcedure.query(async () => {
    return { templates: [
      { id: "concert", name: "Concert/Event", animations: ["fade_in", "slide_up", "pulse"] },
      { id: "product_launch", name: "Product Launch", animations: ["zoom_in", "glow", "typewriter"] },
      { id: "announcement", name: "Announcement", animations: ["bounce", "flash", "slide_in"] },
      { id: "sale", name: "Sale/Promo", animations: ["shake", "countdown", "confetti"] },
    ]};
  }),
  generateAnimationScript: protectedProcedure.input(z.object({ flyerType: z.string(), elements: z.array(z.string()) })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create an animation sequence for a ${input.flyerType} flyer with elements: ${input.elements.join(", ")}. Specify timing, easing, and order for maximum impact.` }],
      max_tokens: 400,
    });
    return { script: completion.choices[0].message.content };
  }),
  getMyJobs: protectedProcedure.query(async ({ ctx }) => {
    return [] as Array<{ id: string; title: string; status: string; type: string; createdAt: string }>;
  })
});
