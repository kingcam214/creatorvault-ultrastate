import { router, publicProcedure } from "./_core/trpc";

export const swarmEngineRouter = router({
  ping: publicProcedure.query(() => { return { ok: true, router: "swarmEngineRouter" }; }),
});
