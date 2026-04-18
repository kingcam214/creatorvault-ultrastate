import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const designDepartmentRouter = router({
  generateDesignBrief: protectedProcedure.input(z.object({
    projectType: z.string(),
    brand: z.string(),
    purpose: z.string(),
    audience: z.string(),
    style: z.string().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a design brief for:
Project: ${input.projectType}
Brand: ${input.brand}
Purpose: ${input.purpose}
Audience: ${input.audience}
Style: ${input.style || "brand-aligned"}

Include: visual direction, color palette, typography suggestions, mood board concepts, and deliverables list.`,
      }],
      max_tokens: 600,
    });
    return { brief: completion.choices[0].message.content };
  }),

  getDesignAssets: protectedProcedure.query(async () => {
    return {
      templates: [
        { category: "Social Media", count: 50, formats: ["1080x1080", "1080x1920", "1200x628"] },
        { category: "Thumbnails", count: 30, formats: ["1280x720", "1920x1080"] },
        { category: "Flyers", count: 25, formats: ["8.5x11", "4x6", "A4"] },
        { category: "Logos", count: 20, formats: ["SVG", "PNG", "AI"] },
      ],
    };
  }),

  generateColorPalette: protectedProcedure.input(z.object({
    brandPersonality: z.string(),
    industry: z.string(),
    mood: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate a brand color palette:
Personality: ${input.brandPersonality}
Industry: ${input.industry}
Mood: ${input.mood}

Provide: primary color (hex), secondary color (hex), accent color (hex), background color (hex), and text color (hex). Explain the psychology behind each choice.`,
      }],
      max_tokens: 400,
    });
    return { palette: completion.choices[0].message.content };
  }),
});
