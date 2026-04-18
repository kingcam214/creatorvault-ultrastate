import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const kingcamPerks = router({
  getPerks: protectedProcedure.query(async ({ ctx }) => ({
    perks: [
      { id: 1, name: "Priority Support", description: "24/7 direct access to support", active: true },
      { id: 2, name: "Early Access", description: "First access to new features", active: true },
      { id: 3, name: "Revenue Share Boost", description: "Extra 5% on all sales", active: false },
      { id: 4, name: "Custom AI Training", description: "Personalized AI model training", active: false },
    ],
    userId: ctx.user.id,
  })),
  activatePerk: protectedProcedure.input(z.object({ perkId: z.number() })).mutation(async ({ ctx, input }) => ({ activated: true, perkId: input.perkId, userId: ctx.user.id })),
  getPerkHistory: protectedProcedure.query(async ({ ctx }) => ({ history: [], userId: ctx.user.id })),
  getAvailableUpgrades: protectedProcedure.query(async () => ({ upgrades: [{ name: "KingCam Pro", price: 97, features: ["All perks", "Unlimited clones", "Priority processing"] }] })),
});
export const kingcamPerksRouter = kingcamPerks;
