import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const storefrontRouter = router({
  getStorefront: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    const products = await db.db.select().from(db.schema.marketplaceProducts).where(eq(db.schema.marketplaceProducts.userId, ctx.user.id)).orderBy(desc(db.schema.marketplaceProducts.createdAt)).limit(20);
    return { products, storeUrl: `/store/${ctx.user.id}` };
  }),
  addProduct: protectedProcedure.input(z.object({ title: z.string(), description: z.string(), price: z.number(), type: z.string(), downloadUrl: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const [product] = await db.db.insert(db.schema.marketplaceProducts).values({ userId: ctx.user.id, title: input.title, description: input.description, price: input.price.toString(), type: input.type, status: "active", createdAt: new Date() }).$returningId();
    return { id: product.id, ...input };
  }),
  generateProductDescription: protectedProcedure.input(z.object({ productName: z.string(), type: z.string(), features: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write a compelling product description for "${input.productName}" (${input.type}):
Features: ${input.features.join(", ")}

Write: headline, description, benefits list, and CTA. Optimize for conversion.` }], max_tokens: 400 });
    return { description: c.choices[0].message.content };
  }),
    // @ts-ignore
  updateProduct: protectedProcedure.input(z.object({ productId: z.number(), updates: z.record(z.unknown()) })).mutation(async ({ input }) => ({ updated: true, productId: input.productId })),
});