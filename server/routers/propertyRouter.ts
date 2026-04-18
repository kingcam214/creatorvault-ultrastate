import { router, publicProcedure } from "../_core/trpc";

export const propertyRouter = router({
  ping: publicProcedure.query(() => { return { ok: true, router: "propertyRouter" }; }),
});
