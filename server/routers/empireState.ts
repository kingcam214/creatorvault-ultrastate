import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq } from "drizzle-orm";
export const empireState = router({
  getState: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).where(eq(db.schema.payments.userId, ctx.user.id)).limit(100);
    const revenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { revenue, status: "active", level: revenue > 10000 ? "empire" : revenue > 1000 ? "business" : "startup", userId: ctx.user.id };
  }),
  updateState: protectedProcedure.input(z.object({ key: z.string(), value: z.unknown() })).mutation(async ({ ctx, input }) => ({ updated: true, key: input.key, userId: ctx.user.id })),
  getEmpireLevel: protectedProcedure.query(async ({ ctx }) => ({ level: 1, xp: 0, nextLevel: 1000, title: "Creator", userId: ctx.user.id })),
});
export const empireStateRouter = empireState;
