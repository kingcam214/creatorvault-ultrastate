import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { notifyOwner } from "../_core/notification";

export const waitlistRouter = router({
  join: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      creatorType: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      // Check if email already exists
      const existing = await db.getWaitlistByEmail(input.email);

      if (existing) {
        throw new Error("This email is already on the waitlist");
      }

      // Insert into waitlist
      await db.addToWaitlist({
        name: input.name,
        email: input.email,
        interestedIn: [input.creatorType],
        status: "pending",
      });

      // Notify owner
      await notifyOwner({
        title: "New Waitlist Signup",
        content: `${input.name} (${input.email}) joined as ${input.creatorType}`,
      });

      return { success: true };
    }),

  // Get all waitlist entries (admin only)
  getAll: publicProcedure
    .query(async () => {
      return await db.getAllWaitlist();
    }),

  // Get waitlist count
  getCount: publicProcedure
    .query(async () => {
      return await db.getWaitlistCount();
    }),
});
