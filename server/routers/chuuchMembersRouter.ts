import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, count } from "drizzle-orm";
export const chuuchMembersRouter = router({
  getMembers: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    // @ts-ignore
    const members = await db.db.select().from(db.schema.chuuchMembers).limit(50);
    return members;
  }),
    // @ts-ignore
  addMember: protectedProcedure.input(z.object({ userId: z.number(), tier: z.string(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
    // @ts-ignore
    const [member] = await db.db.insert(db.schema.chuuchMembers).values({ userId: input.userId, tier: input.tier, notes: input.notes || "", status: "active", addedBy: ctx.user.id, createdAt: new Date() }).$returningId();
    return { id: member.id, tier: input.tier };
    // @ts-ignore
  }),
  getMemberStats: protectedProcedure.query(async () => {
    // @ts-ignore
    const [total] = await db.db.select({ count: count() }).from(db.schema.chuuchMembers);
    // @ts-ignore
    return { total: total.count };
  }),
  updateMemberTier: protectedProcedure.input(z.object({ memberId: z.number(), tier: z.string() })).mutation(async ({ input }) => {
    // @ts-ignore
    await db.db.update(db.schema.chuuchMembers).set({ tier: input.tier }).where(eq(db.schema.chuuchMembers.id, input.memberId));
    return { updated: true };
  }),
});