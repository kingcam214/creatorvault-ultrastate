import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const businessCardsRouter = router({
  generateCardCopy: protectedProcedure.input(z.object({
    name: z.string(),
    title: z.string(),
    company: z.string().optional(),
    tagline: z.string().optional(),
    contact: z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      social: z.string().optional(),
    }),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Design the copy layout for a digital business card:
Name: ${input.name}
Title: ${input.title}
Company: ${input.company || "Independent"}
Tagline: ${input.tagline || "generate one"}
Contact: ${JSON.stringify(input.contact)}

Create: 3 layout variations (minimal, bold, creative), tagline options if not provided, and QR code content suggestion.`,
      }],
      max_tokens: 500,
    });
    return { designs: completion.choices[0].message.content };
  }),

  getCardTemplates: protectedProcedure.query(async () => {
    return {
      templates: [
        { id: "minimal_dark", name: "Minimal Dark", bg: "#0A0A0A", accent: "#00D9FF" },
        { id: "bold_gold", name: "Bold Gold", bg: "#1A1A1A", accent: "#FFD700" },
        { id: "clean_white", name: "Clean White", bg: "#FFFFFF", accent: "#000000" },
        { id: "creator_purple", name: "Creator Purple", bg: "#1E0A3C", accent: "#9B59B6" },
      ],
    };
  }),
});
