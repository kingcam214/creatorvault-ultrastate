import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { desc, count } from "drizzle-orm";
export const ownerCockpitRouter = router({
  getCockpitOverview: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    if (ctx.user.role !== "owner" && ctx.user.role !== "admin") throw new Error("Owner access required");
    const [userCount] = await db.db.select({ count: count() }).from(db.schema.users);
    const [contentCount] = await db.db.select({ count: count() }).from(db.schema.content);
    const [paymentCount] = await db.db.select({ count: count() }).from(db.schema.payments);
    return { users: userCount.count, content: contentCount.count, payments: paymentCount.count };
  }),
  getSystemHealth: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    if (ctx.user.role !== "owner" && ctx.user.role !== "admin") throw new Error("Owner access required");
    return { status: "healthy", uptime: process.uptime(), memory: process.memoryUsage(), timestamp: new Date().toISOString() };
  }),
  getRevenueOverview: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    if (ctx.user.role !== "owner" && ctx.user.role !== "admin") throw new Error("Owner access required");
    const payments = await db.db.select().from(db.schema.payments).orderBy(desc(db.schema.payments.createdAt)).limit(100);
    // @ts-ignore
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { total, count: payments.length, recent: payments.slice(0, 10) };
  }),
});