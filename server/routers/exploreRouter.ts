import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as db from "../db";
import { desc, like, eq } from "drizzle-orm";
export const exploreRouter = router({
  getExploreFeed: publicProcedure.input(z.object({ category: z.string().optional(), limit: z.number().default(20) })).query(async ({ input }) => {
    const items = await db.db.select().from(db.schema.content).where(eq(db.schema.content.status, "published")).orderBy(desc(db.schema.content.createdAt)).limit(input.limit);
    return { items, category: input.category };
  }),
  searchContent: publicProcedure.input(z.object({ query: z.string(), type: z.string().optional() })).query(async ({ input }) => {
    const results = await db.db.select().from(db.schema.content).where(like(db.schema.content.body, `%${input.query}%`)).limit(20);
    return { results, query: input.query };
  }),
  getTrending: publicProcedure.query(async () => {
    const trending = await db.db.select().from(db.schema.content).orderBy(desc(db.schema.content.createdAt)).limit(10);
    return { trending };
  }),
  getCategories: publicProcedure.query(async () => ({ categories: ["music", "video", "design", "business", "lifestyle", "fitness", "education", "comedy"] })),
});