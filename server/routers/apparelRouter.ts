import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const apparelRouter = router({
  generateDesignConcept: protectedProcedure.input(z.object({
    brandName: z.string(),
    style: z.string(),
    targetAudience: z.string(),
    colorScheme: z.string().optional(),
    message: z.string().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate apparel design concepts for:
Brand: ${input.brandName}
Style: ${input.style}
Audience: ${input.targetAudience}
Colors: ${input.colorScheme || "brand colors"}
Message: ${input.message || "brand identity"}

Create: 3 distinct design concepts with descriptions, placement suggestions, and product recommendations (t-shirt, hoodie, hat, etc.).`,
      }],
      max_tokens: 600,
    });
    return { concepts: completion.choices[0].message.content };
  }),

  getProductCatalog: protectedProcedure.query(async () => {
    return {
      products: [
        { type: "t-shirt", basePrice: 15, sizes: ["XS", "S", "M", "L", "XL", "XXL"], printAreas: ["front", "back", "sleeve"] },
        { type: "hoodie", basePrice: 28, sizes: ["S", "M", "L", "XL", "XXL"], printAreas: ["front", "back", "chest"] },
        { type: "hat", basePrice: 18, sizes: ["one-size"], printAreas: ["front", "side"] },
        { type: "long-sleeve", basePrice: 20, sizes: ["XS", "S", "M", "L", "XL"], printAreas: ["front", "back"] },
      ],
    };
  }),

  calculatePricing: protectedProcedure.input(z.object({
    productType: z.string(),
    quantity: z.number(),
    printColors: z.number().default(1),
  })).query(async ({ input }) => {
    const basePrices: Record<string, number> = { "t-shirt": 15, "hoodie": 28, "hat": 18, "long-sleeve": 20 };
    const base = basePrices[input.productType] || 20;
    const printCost = input.printColors * 2;
    const unitCost = base + printCost;
    const suggestedRetail = unitCost * 2.5;
    return { unitCost, suggestedRetail, margin: suggestedRetail - unitCost, quantity: input.quantity };
  }),
});
