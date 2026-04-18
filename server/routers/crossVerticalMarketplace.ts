import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, like } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const crossVerticalMarketplaceRouter = router({
  searchAcrossVerticals: protectedProcedure.input(z.object({
    query: z.string(),
    verticals: z.array(z.string()).optional(),
    priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
  })).query(async ({ input }) => {
    const products = await db.db.select()
      .from(db.schema.marketplaceProducts)
      .where(like(db.schema.marketplaceProducts.title, `%${input.query}%`))
      .limit(20);
    return { products, query: input.query };
  }),

  getVerticals: protectedProcedure.query(async () => {
    return {
      verticals: [
        { id: "digital", name: "Digital Products", icon: "💾" },
        { id: "services", name: "Creator Services", icon: "🎯" },
        { id: "courses", name: "Courses & Education", icon: "🎓" },
        { id: "music", name: "Music & Audio", icon: "🎵" },
        { id: "design", name: "Design Assets", icon: "🎨" },
        { id: "video", name: "Video Content", icon: "🎬" },
        { id: "coaching", name: "Coaching & Consulting", icon: "💡" },
      ],
    };
  }),

  recommendProducts: protectedProcedure.input(z.object({
    userInterests: z.array(z.string()),
    budget: z.number().optional(),
  })).mutation(async ({ input }) => {
    const products = await db.db.select()
      .from(db.schema.marketplaceProducts)
      .where(eq(db.schema.marketplaceProducts.status, "active"))
      .limit(10);
    return { recommended: products };
  }),
});
