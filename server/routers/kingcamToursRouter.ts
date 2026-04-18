import { router, publicProcedure } from "../_core/trpc";

export const kingcamToursRouter = router({
  ping: publicProcedure.query(() => { return { ok: true, router: "kingcamToursRouter" }; }),
});
