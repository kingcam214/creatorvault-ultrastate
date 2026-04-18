import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, count } from "drizzle-orm";
export const waitlistEngine = router({
  joinWaitlist: publicProcedure.input(z.object({ email: z.string().email(), name: z.string().optional(), source: z.string().optional() })).mutation(async ({ input }) => {
    const existing = await db.db.select().from(db.schema.waitlist).where(eq(db.schema.waitlist.email, input.email)).limit(1);
    if (existing.length > 0) return { joined: false, message: "Already on waitlist", position: existing[0].position };
    const [total] = await db.db.select({ count: count() }).from(db.schema.waitlist);
    const [entry] = await db.db.insert(db.schema.waitlist).values({ email: input.email, name: input.name || "", source: input.source || "direct", position: (total.count || 0) + 1, createdAt: new Date() }).$returningId();
    return { joined: true, position: (total.count || 0) + 1, id: entry.id };
  }),
  getWaitlistStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "owner" && ctx.user.role !== "admin") throw new Error("Admin access required");
    const [total] = await db.db.select({ count: count() }).from(db.schema.waitlist);
    return { total: total.count };
  }),
  getWaitlistPosition: publicProcedure.input(z.object({ email: z.string().email() })).query(async ({ input }) => {
    const [entry] = await db.db.select().from(db.schema.waitlist).where(eq(db.schema.waitlist.email, input.email)).limit(1);
    if (!entry) return { found: false };
    return { found: true, position: entry.position };
  }),
});
export const waitlistEngineRouter = waitlistEngine;
