import { z } from "zod";
import { router, ownerProcedure } from "../_core/trpc";
import * as db from "../db";
import { desc, count } from "drizzle-orm";
export const ownerCockpitRouter = router({
  getCockpitOverview: ownerProcedure.query(async ({ ctx }) => {
    const [userCount] = await db.db.select({ count: count() }).from(db.schema.users);
    const [contentCount] = await db.db.select({ count: count() }).from(db.schema.content);
    const [paymentCount] = await db.db.select({ count: count() }).from(db.schema.payments);
    return { users: userCount.count, content: contentCount.count, payments: paymentCount.count };
  }),
  getSystemHealth: ownerProcedure.query(async ({ ctx }) => {
    return { status: "healthy", uptime: process.uptime(), memory: process.memoryUsage(), timestamp: new Date().toISOString() };
  }),
  getRevenueOverview: ownerProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).orderBy(desc(db.schema.payments.createdAt)).limit(100);
    // @ts-ignore
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { total, count: payments.length, recent: payments.slice(0, 10) };
  }),
});