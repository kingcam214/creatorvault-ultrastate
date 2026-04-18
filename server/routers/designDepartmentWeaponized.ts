import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const designDepartmentWeaponizedRouter = router({
  weaponizeDesign: protectedProcedure.input(z.object({
    designType: z.string(),
    objective: z.enum(["convert", "go_viral", "build_authority", "drive_sales"]),
    audience: z.string(),
    message: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a weaponized design strategy for maximum ${input.objective}:
Design Type: ${input.designType}
Audience: ${input.audience}
Core Message: ${input.message}

Apply: psychological triggers, visual hierarchy, color psychology, and conversion principles. Give specific design directions.`,
      }],
      max_tokens: 600,
    });
    return { strategy: completion.choices[0].message.content };
  }),

  generateConversionCopy: protectedProcedure.input(z.object({
    product: z.string(),
    benefit: z.string(),
    urgency: z.boolean().default(false),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Write high-conversion copy for ${input.product}:
Key Benefit: ${input.benefit}
${input.urgency ? "Include urgency/scarcity elements." : ""}

Write: headline, subheadline, 3 bullet points, and CTA button text. Optimize for conversion.`,
      }],
      max_tokens: 300,
    });
    return { copy: completion.choices[0].message.content };
  }),
});
