import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";

export const marketplaceAIRouter = router({
  // Generate product description
  generateDescription: protectedProcedure
    .input(z.object({
      title: z.string(),
      type: z.enum(["digital", "physical", "service"]),
      category: z.string(),
      keywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Generate a compelling product description for a ${input.type} product titled "${input.title}" in the ${input.category} category.${input.keywords && input.keywords.length > 0 ? ` Keywords: ${input.keywords.join(", ")}.` : ""}

Requirements:
- Write 2-3 paragraphs
- Highlight key benefits and features
- Use persuasive, engaging language
- Target potential buyers
- Include a call-to-action

Generate ONLY the description text, no additional commentary.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert copywriter specializing in product descriptions that convert." },
          { role: "user", content: prompt },
        ],
      });

      return {
        description: response.choices[0].message.content.trim(),
      };
    }),

  // Optimize pricing
  optimizePricing: protectedProcedure
    .input(z.object({
      title: z.string(),
      type: z.enum(["digital", "physical", "service"]),
      category: z.string(),
      currentPrice: z.number().optional(),
      targetAudience: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Analyze pricing for a ${input.type} product titled "${input.title}" in the ${input.category} category.${input.currentPrice ? ` Current price: $${(input.currentPrice / 100).toFixed(2)}.` : ""}${input.targetAudience && input.targetAudience.length > 0 ? ` Target audience: ${input.targetAudience.join(", ")}.` : ""}

Provide:
1. Recommended price (in USD)
2. Price range (min-max)
3. Pricing strategy (premium, competitive, value)
4. Brief explanation (1-2 sentences)

Return as JSON with this exact structure:
{
  "recommendedPrice": number (in cents),
  "priceRange": { "min": number (in cents), "max": number (in cents) },
  "strategy": "premium" | "competitive" | "value",
  "explanation": "string"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a pricing strategist. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pricing_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendedPrice: { type: "number", description: "Recommended price in cents" },
                priceRange: {
                  type: "object",
                  properties: {
                    min: { type: "number", description: "Minimum price in cents" },
                    max: { type: "number", description: "Maximum price in cents" },
                  },
                  required: ["min", "max"],
                  additionalProperties: false,
                },
                strategy: { type: "string", enum: ["premium", "competitive", "value"], description: "Pricing strategy" },
                explanation: { type: "string", description: "Brief explanation" },
              },
              required: ["recommendedPrice", "priceRange", "strategy", "explanation"],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    }),

  // Generate product image
  generateProductImage: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(["digital", "physical", "service"]),
      style: z.enum(["realistic", "minimalist", "vibrant", "professional"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const stylePrompts = {
        realistic: "photorealistic, high quality, professional photography",
        minimalist: "minimalist design, clean, simple, modern",
        vibrant: "vibrant colors, eye-catching, energetic, bold",
        professional: "professional, sleek, corporate, polished",
      };

      const style = input.style || "professional";
      const prompt = `Product image for "${input.title}": ${input.description.substring(0, 200)}. ${stylePrompts[style]}. High quality, commercial product photography.`;

      const result = await generateImage({ prompt });

      return {
        imageUrl: result.url,
      };
    }),

  // Generate keywords
  generateKeywords: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      category: z.string(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Generate 5-10 relevant keywords for a product titled "${input.title}" in the ${input.category} category. Description: ${input.description.substring(0, 300)}

Return as JSON array of strings:
["keyword1", "keyword2", ...]`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an SEO expert. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "keywords",
            strict: true,
            schema: {
              type: "object",
              properties: {
                keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of relevant keywords",
                },
              },
              required: ["keywords"],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content);
      return { keywords: result.keywords };
    }),
});
