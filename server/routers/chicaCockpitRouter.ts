import { router, publicProcedure } from "../_core/trpc";

export const chicaCockpitRouter = router({
  ping: publicProcedure.query(() => { return { ok: true, router: "chicaCockpitRouter" }; }),
});
