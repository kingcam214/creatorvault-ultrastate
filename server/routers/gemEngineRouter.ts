import { router, publicProcedure } from "../_core/trpc";

export const gemEngineRouter = router({
  ping: publicProcedure.query(() => { return { ok: true, router: "gemEngineRouter" }; }),
});
