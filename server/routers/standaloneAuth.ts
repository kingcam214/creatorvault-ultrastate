import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const standaloneAuth = router({
  register: publicProcedure.input(z.object({
    email: z.string().email(), password: z.string().min(8), username: z.string().min(3),
  })).mutation(async ({ input }) => {
    const existing = await db.db.select().from(db.schema.users).where(eq(db.schema.users.email, input.email)).limit(1);
    if (existing.length > 0) throw new Error("Email already registered");
    const normalizedEmail = input.email.trim().toLowerCase();
    const hashed = await bcrypt.hash(input.password, 10);
    const openId = `local:${normalizedEmail}`;
    const [user] = await db.db.insert(db.schema.users).values({
      openId,
      email: normalizedEmail,
      password: hashed,
      username: input.username,
      name: input.username,
      loginMethod: "password",
      role: "user",
      createdAt: new Date(),
    } as any).$returningId();
    try {
      await db.db.execute(sql`UPDATE users SET password = ${hashed}, is_active = 1 WHERE id = ${user.id}`);
    } catch (error) {
      console.warn("[standaloneAuth] unable to write local-auth compatibility fields; continuing with schema defaults", error);
    }
    return { id: user.id, email: normalizedEmail, username: input.username };
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
