import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
export const kingcamVault = router({
  getVaultContents: protectedProcedure.query(async ({ ctx }) => {
    const content = await db.db.select().from(db.schema.content).where(eq(db.schema.content.userId, ctx.user.id)).orderBy(desc(db.schema.content.createdAt)).limit(50);
    return { contents: content, total: content.length };
  }),
  addToVault: protectedProcedure.input(z.object({ type: z.string(), data: z.record(z.unknown()), tags: z.array(z.string()).optional() })).mutation(async ({ ctx, input }) => {
    const [item] = await db.db.insert(db.schema.content).values({ userId: ctx.user.id, type: input.type, body: JSON.stringify(input.data), status: "vault", createdAt: new Date() }).$returningId();
    return { id: item.id, type: input.type };
  }),
  removeFromVault: protectedProcedure.input(z.object({ itemId: z.number() })).mutation(async ({ input }) => {
    await db.db.delete(db.schema.content).where(eq(db.schema.content.id, input.itemId));
    return { removed: true };
  }),
  getVaultStats: protectedProcedure.query(async ({ ctx }) => {
    const items = await db.db.select().from(db.schema.content).where(eq(db.schema.content.userId, ctx.user.id));
    return { total: items.length, byType: items.reduce((acc: Record<string, number>, i) => { acc[i.type || "other"] = (acc[i.type || "other"] || 0) + 1; return acc; }, {}) };
  }),
});
export const kingcamVaultRouter = kingcamVault;
