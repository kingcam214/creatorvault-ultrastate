import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const standaloneAuth = router({
  register: publicProcedure.input(z.object({
    email: z.string().email(), password: z.string().min(8), username: z.string().min(3),
  })).mutation(async ({ input }) => {
    const existing = await db.db.select().from(db.schema.users).where(eq(db.schema.users.email, input.email)).limit(1);
    if (existing.length > 0) throw new Error("Email already registered");
    const hashed = await bcrypt.hash(input.password, 10);
    const [user] = await db.db.insert(db.schema.users).values({
      email: input.email, password: hashed, username: input.username, role: "creator", createdAt: new Date(),
    }).$returningId();
    return { id: user.id, email: input.email, username: input.username };
  }),
  checkEmail: publicProcedure.input(z.object({ email: z.string().email() })).query(async ({ input }) => {
    const existing = await db.db.select().from(db.schema.users).where(eq(db.schema.users.email, input.email)).limit(1);
    return { available: existing.length === 0 };
  }),
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db.db.select().from(db.schema.users).where(eq(db.schema.users.id, ctx.user.id)).limit(1);
    if (!user) throw new Error("User not found");
    const { password, ...profile } = user;
    return profile;
  }),
});

export const standaloneAuthRouter = standaloneAuth;
